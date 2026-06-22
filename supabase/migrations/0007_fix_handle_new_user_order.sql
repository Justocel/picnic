-- =============================================================================
-- 0007 — FIX handle_new_user: orden correcto del trigger
-- =============================================================================
-- El trigger anterior intentaba marcar el token como `used_by = NEW.id`
-- antes de crear el profile. Como editor_invitations.used_by tiene FK a
-- profiles(id), la FK fallaba (el profile aún no existía), el trigger
-- explotaba, y el INSERT en auth.users se rollbackeaba → el cliente recibía
-- "No pudimos crear la cuenta" sin pista de qué falló.
--
-- Fix: insertar el profile PRIMERO; recién después marcar el token como
-- usado (cuando profiles.id ya existe y la FK puede resolverse).
-- =============================================================================

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

  -- Resolver invitación: lookup pero NO marcar usado todavía (el profile
  -- aún no existe → la FK de editor_invitations.used_by → profiles falla).
  IF v_token IS NOT NULL THEN
    SELECT * INTO v_invitation
      FROM editor_invitations
      WHERE token = v_token
        AND used_at IS NULL
        AND expires_at > now()
      FOR UPDATE;
    IF FOUND THEN
      v_role := 'editor';
    END IF;
  END IF;

  -- 1) Crear el profile primero.
  INSERT INTO profiles (id, nombre, role) VALUES (NEW.id, v_nombre, v_role);

  -- 2) Recién ahora podemos marcar el token (la FK ya resuelve).
  IF v_role = 'editor' AND v_token IS NOT NULL THEN
    UPDATE editor_invitations
      SET used_at = now(), used_by = NEW.id
      WHERE token = v_token;
  END IF;

  RETURN NEW;
END;
$$;
