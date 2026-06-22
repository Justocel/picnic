-- =============================================================================
-- 0006 — SITE SETTINGS
-- =============================================================================
-- Tabla key/value para datos editables del sitio: contacto, redes sociales,
-- bio del proyecto. Lectura pública (anon), escritura solo editores.
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_select ON site_settings;
CREATE POLICY site_settings_select ON site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS site_settings_write ON site_settings;
CREATE POLICY site_settings_write ON site_settings
  FOR ALL TO authenticated
  USING (is_editor())
  WITH CHECK (is_editor());

-- Seed: valores iniciales vacíos para los campos que la UI espera. Si no
-- existe la fila, el componente cae a un fallback.
INSERT INTO site_settings (key, value) VALUES
  ('contact_email',   ''),
  ('instagram_url',   ''),
  ('youtube_url',     ''),
  ('whatsapp_url',    ''),
  ('twitter_url',     ''),
  ('bio_corta',       '')
ON CONFLICT (key) DO NOTHING;

-- Trigger para updated_at.
DROP TRIGGER IF EXISTS site_settings_set_updated_at ON site_settings;
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
