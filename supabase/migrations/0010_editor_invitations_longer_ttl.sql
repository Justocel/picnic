-- =============================================================================
-- 0010 — Extender TTL de invitaciones de editor a 60 días
-- =============================================================================
-- Antes: 7 días desde la creación. Quedaba justo para corrección académica
-- (el profe podría volver al link después y encontrarlo vencido).
-- Ahora: 60 días — cubre ventanas de corrección extensas sin volverse "para
-- siempre" (un token con TTL infinito sería un secreto eterno).
--
-- También extiende los tokens existentes que están activos (used_at IS NULL)
-- para que el que ya mandó al profe siga sirviendo.
-- =============================================================================

ALTER TABLE editor_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '60 days');

-- Solo bumpeamos los que no fueron usados todavía. Los ya usados quedan con
-- su expires_at original (no importa, used_at NOT NULL → no se reutilizan).
UPDATE editor_invitations
   SET expires_at = now() + interval '60 days'
 WHERE used_at IS NULL
   AND expires_at < now() + interval '60 days';
