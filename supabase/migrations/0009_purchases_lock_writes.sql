-- =============================================================================
-- 0009 — Lockear writes a purchases (defensa en profundidad)
-- =============================================================================
-- Bug detectado en auditoría: la policy purchases_update usaba is_editor(),
-- permitiendo que cualquier editor UPDATE seteara estado='pagada' en cualquier
-- fila desde el navegador con su anon key, bypaseando Mercado Pago. Como la
-- policy de SELECT del bucket revistas-pdf acepta 'pagada' como acceso válido,
-- un editor se podía regalar acceso a cualquier revista sin pagar.
--
-- Fix:
--   1. Reescribir purchases_update para que NUNCA matchee desde anon/auth
--      (auth.role() distinto de service_role → niegue).
--   2. Trigger BEFORE UPDATE como defensa en profundidad: bloquea transiciones
--      a estados que dan acceso a PDFs si el caller no es service_role.
--
-- El webhook (/api/webhook/mp) y /api/admin/reconfirm ya usan SUPABASE_SECRET_KEY
-- (service_role), así que bypaseaban RLS de todas formas y siguen funcionando.
-- =============================================================================

-- 1. Reemplazar la policy: USING falso siempre desde cliente.
DROP POLICY IF EXISTS purchases_update ON purchases;
CREATE POLICY purchases_update ON purchases
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

-- 2. Defensa en profundidad: si alguna vez se afloja la policy o se agrega una
--    nueva con bug, el trigger protege la transición crítica.
CREATE OR REPLACE FUNCTION prevent_purchase_estado_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- service_role es el único caller legítimo para mover a estados pagados.
  caller_role := current_setting('request.jwt.claims', true)::json->>'role';
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Cualquier otro caller (anon/authenticated): no puede setear ni mantener
  -- estados que dan acceso a PDF.
  IF NEW.estado IN ('completada', 'pagada', 'confirmada')
     AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    RAISE EXCEPTION 'Solo el webhook/admin (service_role) puede confirmar pagos. Caller: %', caller_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchases_block_estado_escalation ON purchases;
CREATE TRIGGER purchases_block_estado_escalation
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION prevent_purchase_estado_escalation();
