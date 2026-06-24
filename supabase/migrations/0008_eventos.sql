-- =============================================================================
-- 0008 — Tabla eventos: CRUD inline para editores
-- =============================================================================
-- Hasta acá los eventos vivían hardcodeados en app/data/data.js. Esta
-- migración los mueve a la DB siguiendo el mismo patrón que articulos /
-- integrantes / videos: RLS estricta, anon ve solo visible=true, editores
-- ven todo y mutan.
-- =============================================================================

CREATE TABLE IF NOT EXISTS eventos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  fecha       date NOT NULL,
  image_path  text,
  descripcion text,
  orden       int NOT NULL DEFAULT 0,
  visible     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_fecha_idx        ON eventos (fecha DESC);
CREATE INDEX IF NOT EXISTS eventos_visible_fecha_idx ON eventos (visible, fecha DESC);

DROP TRIGGER IF EXISTS eventos_set_updated_at ON eventos;
CREATE TRIGGER eventos_set_updated_at BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_select ON eventos;
CREATE POLICY eventos_select ON eventos
  FOR SELECT TO anon, authenticated
  USING (visible = true OR is_editor());

DROP POLICY IF EXISTS eventos_write ON eventos;
CREATE POLICY eventos_write ON eventos
  FOR ALL TO authenticated
  USING (is_editor()) WITH CHECK (is_editor());

-- Seed con los mocks históricos para que la sección no quede vacía al
-- aplicar la migración. Idempotente: solo inserta si la tabla está vacía.
INSERT INTO eventos (nombre, fecha, image_path, orden, visible)
SELECT * FROM (VALUES
  ('Evento Próximo 1', DATE '2026-08-05', '/Eventos/1.png', 1, true),
  ('Evento Próximo 2', DATE '2026-08-10', '/Eventos/2.png', 2, true),
  ('Evento Próximo 3', DATE '2026-08-15', '/Eventos/3.png', 3, true),
  ('Evento Pasado 1',  DATE '2026-03-30', '/Eventos/4.png', 4, true),
  ('Evento Pasado 2',  DATE '2026-03-25', '/Eventos/5.png', 5, true),
  ('Evento Pasado 3',  DATE '2026-03-20', '/Eventos/6.png', 6, true)
) AS seed(nombre, fecha, image_path, orden, visible)
WHERE NOT EXISTS (SELECT 1 FROM eventos);
