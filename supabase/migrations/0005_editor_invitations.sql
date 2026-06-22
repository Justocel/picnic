-- =============================================================================
-- 0005 — INVITACIONES DE EDITORES
-- =============================================================================
-- Sistema para que el dueño del proyecto invite editores con un link único.
-- Flow:
--   1) Editor existente (o admin SQL) crea una fila en editor_invitations.
--      Le pasa el token al invitado por canal privado (mail/WhatsApp).
--   2) El invitado abre /registrarme?invite=<token> y completa el formulario.
--   3) supabase.auth.signUp() incluye options.data = { invite_token: '<token>' }.
--   4) El trigger handle_new_user lee el invite_token de raw_user_meta_data,
--      valida que exista, no esté usado y no esté expirado. Si OK, crea el
--      profile con role='editor' y marca el token como used.
--   5) Si el token es inválido, el profile se crea como 'user' normal y el
--      token queda intacto (otro puede usarlo). No se levanta excepción para
--      no romper el flujo de auth.
-- =============================================================================


-- 1. Tabla de tokens.
CREATE TABLE IF NOT EXISTS editor_invitations (
  token       text PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  used_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  used_at     timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editor_invitations_active_idx
  ON editor_invitations (expires_at)
  WHERE used_at IS NULL;


-- 2. RLS: solo editores pueden ver/crear tokens.
ALTER TABLE editor_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editor_invitations_select ON editor_invitations;
CREATE POLICY editor_invitations_select ON editor_invitations
  FOR SELECT TO authenticated
  USING (is_editor());

DROP POLICY IF EXISTS editor_invitations_insert ON editor_invitations;
CREATE POLICY editor_invitations_insert ON editor_invitations
  FOR INSERT TO authenticated
  WITH CHECK (is_editor() AND created_by = auth.uid());

DROP POLICY IF EXISTS editor_invitations_delete ON editor_invitations;
CREATE POLICY editor_invitations_delete ON editor_invitations
  FOR DELETE TO authenticated
  USING (is_editor());
-- No UPDATE policy: los tokens son inmutables salvo por el trigger que los marca usados.


-- 3. Reescribimos handle_new_user para soportar invite_token.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token         text;
  v_invitation    editor_invitations%ROWTYPE;
  v_role          user_role := 'user';
  v_nombre        text;
BEGIN
  v_token  := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
  v_nombre := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Si vino un token, intentamos canjearlo. Cualquier falla del token NO
  -- aborta el signup — el user se crea normal como 'user'.
  IF v_token IS NOT NULL THEN
    SELECT * INTO v_invitation
      FROM editor_invitations
      WHERE token = v_token
        AND used_at IS NULL
        AND expires_at > now()
      FOR UPDATE;
    IF FOUND THEN
      v_role := 'editor';
      UPDATE editor_invitations
        SET used_at = now(), used_by = NEW.id
        WHERE token = v_token;
    END IF;
  END IF;

  INSERT INTO profiles (id, nombre, role) VALUES (NEW.id, v_nombre, v_role);
  RETURN NEW;
END;
$$;
-- El trigger ya existe (on_auth_user_created en auth.users) — solo cambiamos la función.
