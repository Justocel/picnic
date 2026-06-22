import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getPaymentClient } from '@/lib/mercadopago';

/**
 * POST /api/webhook/mp
 *
 * Webhook de Mercado Pago. MP nos avisa cuando hay un cambio en un payment.
 * Formato (v2 — "Webhooks"):
 *   {
 *     type: 'payment',
 *     data: { id: '<payment_id>' }
 *   }
 *
 * Validación de firma:
 *   - Header `x-signature: ts=<ts>,v1=<hash>`
 *   - Header `x-request-id`
 *   - Manifest: `id:<dataId>;request-id:<requestId>;ts:<ts>;`
 *   - hash = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET)
 *
 * Si la firma no valida → 401. Si no hay MP_WEBHOOK_SECRET seteado → solo log
 * (modo desarrollo). En producción TIENE que estar seteado.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifySignature(request, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // En producción no debería pasar: si MP llega sin que validemos, cualquiera
    // puede spoofear. Pero por ahora dejamos pasar (con warning) para no romper
    // el diagnóstico actual donde necesitamos saber si MP llega o no.
    console.warn('[mp webhook] MP_WEBHOOK_SECRET no seteado — saltando verificación');
    return true;
  }
  const sigHeader = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
  // Formato: "ts=<unix>,v1=<hex>"
  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  // timingSafeEqual con buffers del mismo tamaño.
  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

export async function POST(request) {
  const reqId = request.headers.get('x-request-id') || 'no-req-id';
  // Log de entrada (antes de cualquier validación): si esto aparece en Vercel
  // sabemos que MP está llegando. Si NO aparece nunca, el webhook URL en MP
  // está mal o el dominio cambió y la preferencia tenía la URL vieja.
  console.log('[mp webhook] incoming', {
    reqId,
    hasSignature: !!request.headers.get('x-signature'),
    contentType: request.headers.get('content-type'),
    ua: request.headers.get('user-agent'),
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    console.error('[mp webhook] config faltante', { reqId });
    return Response.json({ error: 'Config Supabase faltante' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    console.warn('[mp webhook] body inválido', { reqId });
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  // MP manda varios "tipos" — solo nos interesa payment.
  if (body?.type !== 'payment') {
    console.log('[mp webhook] ignorado', { reqId, type: body?.type, action: body?.action });
    return Response.json({ ignored: true, type: body?.type });
  }

  const paymentId = String(body?.data?.id || '');
  if (!paymentId) {
    console.warn('[mp webhook] sin data.id', { reqId, body });
    return Response.json({ error: 'Sin data.id' }, { status: 400 });
  }

  if (!verifySignature(request, paymentId)) {
    console.warn('[mp webhook] firma inválida', { reqId, paymentId });
    return Response.json({ error: 'Firma inválida' }, { status: 401 });
  }

  // Consultar el payment a MP para no confiar en el body (puede ser spoofeado).
  let payment;
  try {
    payment = await getPaymentClient().get({ id: paymentId });
  } catch (err) {
    console.error('[mp webhook] error get payment:', { reqId, paymentId, err: err?.message });
    return Response.json({ error: 'No se pudo leer el payment' }, { status: 502 });
  }

  const orderId = payment.external_reference;
  const estadoMp = payment.status;
  const pagadoEn =
    payment.date_approved || payment.date_last_updated || new Date().toISOString();

  console.log('[mp webhook] payment fetched', {
    reqId,
    paymentId: payment?.id,
    status: estadoMp,
    external_reference: orderId,
    date_approved: payment?.date_approved,
  });

  if (!orderId) {
    console.warn('[mp webhook] payment sin external_reference', { reqId, paymentId });
    return Response.json({ error: 'Payment sin external_reference' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('confirmar_pago', {
    p_order_id: orderId,
    p_payment_id: String(payment.id),
    p_estado_mp: estadoMp,
    p_pagado_en: pagadoEn,
  });

  console.log('[mp webhook] confirmar_pago result', {
    reqId,
    orderId,
    paymentId: payment?.id,
    data,
    error: error?.message,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, ...data });
}
