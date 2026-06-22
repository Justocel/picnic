import { createClient } from '@supabase/supabase-js';
import { getPaymentClient } from '@/lib/mercadopago';

/**
 * POST /api/admin/reconfirm
 *
 * Endpoint de rescate manual: dado un payment_id de Mercado Pago, hace el
 * mismo flow que el webhook (fetch payment + invocar confirmar_pago) sin
 * validar firma. Útil para:
 *   - Rescatar purchases que quedaron en 'pendiente' porque el webhook no
 *     llegó (URL desactualizada, secret mismatch, etc).
 *   - Reaplicar idempotentemente un payment cuando se sospecha bug.
 *
 * Auth: header `x-admin-secret` debe matchear `process.env.ADMIN_SECRET`.
 * No usa MP_WEBHOOK_SECRET (el webhook secret es para validar requests del
 * propio MP, no del operador humano).
 *
 * Body: { paymentId: string }
 * Response: { payment, rpc, error? }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const secret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'body inválido' }, { status: 400 });
  }

  const paymentId = body?.paymentId ? String(body.paymentId) : null;
  if (!paymentId) {
    return Response.json({ error: 'falta paymentId' }, { status: 400 });
  }

  let payment;
  try {
    payment = await getPaymentClient().get({ id: paymentId });
  } catch (err) {
    return Response.json(
      { error: 'no se pudo leer el payment en MP', detail: err?.message },
      { status: 502 }
    );
  }

  const orderId = payment?.external_reference;
  if (!orderId) {
    return Response.json(
      {
        error: 'payment sin external_reference',
        payment: {
          id: payment?.id,
          status: payment?.status,
        },
      },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('confirmar_pago', {
    p_order_id: orderId,
    p_payment_id: String(payment.id),
    p_estado_mp: payment.status,
    p_pagado_en: payment.date_approved || new Date().toISOString(),
  });

  return Response.json({
    payment: {
      id: payment.id,
      status: payment.status,
      external_reference: orderId,
      date_approved: payment.date_approved,
    },
    rpc: data,
    error: error?.message,
  });
}
