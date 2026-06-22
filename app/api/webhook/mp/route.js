import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getPaymentClient, getMerchantOrderClient } from '@/lib/mercadopago';

/**
 * POST /api/webhook/mp
 *
 * Endpoint que recibe notificaciones de Mercado Pago. MP envía DOS formatos:
 *
 * (a) Webhooks v2 — body JSON:
 *     { type: 'payment' | 'merchant_order', data: { id: '<id>' } }
 *     Headers: x-signature (HMAC), x-request-id.
 *
 * (b) IPN clásico — query params + body vacío o pequeño:
 *     POST /api/webhook/mp?topic=payment&id=<id>
 *     POST /api/webhook/mp?topic=merchant_order&id=<id>
 *     User-Agent: "MercadoPago Feed v2.0"
 *     SIN headers de firma — MP usa el access_token al consultar el payment
 *     desde el server como la única verificación.
 *
 * Aceptamos ambos. Para cualquier formato:
 *   - topic 'payment' → fetch del payment + confirmar_pago.
 *   - topic 'merchant_order' → fetch del merchant_order, iterar sus payments
 *     y confirmar cada uno.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifySignature(request, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const sigHeader = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
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
  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

/**
 * Procesa un payment_id: lo busca en MP, valida que tenga external_reference
 * y llama a confirmar_pago. Idempotente — la RPC ignora rows que ya no están
 * en 'pendiente'.
 */
async function processPayment(supabase, paymentId, ctx) {
  let payment;
  try {
    payment = await getPaymentClient().get({ id: String(paymentId) });
  } catch (err) {
    console.error('[mp webhook] error get payment', { ...ctx, paymentId, err: err?.message });
    return { ok: false, reason: 'fetch_failed' };
  }
  const orderId = payment?.external_reference;
  const estadoMp = payment?.status;
  const pagadoEn =
    payment?.date_approved || payment?.date_last_updated || new Date().toISOString();

  console.log('[mp webhook] payment fetched', {
    ...ctx,
    paymentId: payment?.id,
    status: estadoMp,
    external_reference: orderId,
  });

  if (!orderId) {
    return { ok: false, reason: 'no_external_reference', paymentId: payment?.id };
  }

  const { data, error } = await supabase.rpc('confirmar_pago', {
    p_order_id: orderId,
    p_payment_id: String(payment.id),
    p_estado_mp: estadoMp,
    p_pagado_en: pagadoEn,
  });

  console.log('[mp webhook] confirmar_pago result', {
    ...ctx,
    orderId,
    paymentId: payment?.id,
    data,
    error: error?.message,
  });

  if (error) return { ok: false, reason: 'rpc_error', message: error.message };
  return { ok: true, data, paymentId: payment.id, orderId };
}

/**
 * Procesa un merchant_order_id: lo busca, itera sus payments y procesa
 * los que estén aprobados.
 */
async function processMerchantOrder(supabase, merchantOrderId, ctx) {
  let mo;
  try {
    mo = await getMerchantOrderClient().get({ merchantOrderId: String(merchantOrderId) });
  } catch (err) {
    console.error('[mp webhook] error get merchant_order', {
      ...ctx,
      merchantOrderId,
      err: err?.message,
    });
    return { ok: false, reason: 'fetch_failed' };
  }
  const payments = Array.isArray(mo?.payments) ? mo.payments : [];
  console.log('[mp webhook] merchant_order fetched', {
    ...ctx,
    merchantOrderId,
    status: mo?.status,
    payments: payments.length,
    external_reference: mo?.external_reference,
  });
  if (payments.length === 0) {
    return { ok: true, processed: 0, reason: 'no_payments_yet' };
  }
  const results = [];
  for (const p of payments) {
    if (!p?.id) continue;
    const r = await processPayment(supabase, p.id, ctx);
    results.push(r);
  }
  return { ok: true, processed: results.length, results };
}

export async function POST(request) {
  const reqId = request.headers.get('x-request-id') || 'no-req-id';
  const url = new URL(request.url);
  const queryTopic = url.searchParams.get('topic') || url.searchParams.get('type');
  const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');

  console.log('[mp webhook] incoming', {
    reqId,
    queryTopic,
    queryId,
    hasSignature: !!request.headers.get('x-signature'),
    ua: request.headers.get('user-agent'),
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    console.error('[mp webhook] config faltante', { reqId });
    return Response.json({ error: 'Config Supabase faltante' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });

  // Body es opcional en IPN. Lo parseamos si viene, sino seguimos.
  let body = null;
  try {
    body = await request.json();
  } catch {
    // IPN clásico viene con body vacío — no es error.
  }

  // Determinar topic + id: primero del body (v2), después del query (IPN).
  const topic = body?.type || queryTopic;
  const resourceId = body?.data?.id || queryId;

  if (!topic || !resourceId) {
    console.log('[mp webhook] ignorado: sin topic o id', { reqId, topic, resourceId });
    return Response.json({ ignored: true, reason: 'no_topic_or_id' });
  }

  // Validar firma solo si vino body JSON con headers de firma (formato v2).
  // El IPN clásico no firma — confiamos en que cuando consultamos el payment
  // al SDK con nuestro access_token, MP nos da la verdad.
  if (body && request.headers.get('x-signature')) {
    if (!verifySignature(request, body?.data?.id)) {
      console.warn('[mp webhook] firma inválida', { reqId });
      return Response.json({ error: 'Firma inválida' }, { status: 401 });
    }
  }

  const ctx = { reqId, topic, resourceId };

  if (topic === 'payment') {
    const r = await processPayment(supabase, resourceId, ctx);
    return Response.json({ topic, ...r });
  }

  if (topic === 'merchant_order') {
    const r = await processMerchantOrder(supabase, resourceId, ctx);
    return Response.json({ topic, ...r });
  }

  console.log('[mp webhook] topic desconocido', { reqId, topic });
  return Response.json({ ignored: true, topic });
}

// Mercado Pago también puede mandar GET (algunas integraciones viejas para
// "probar" el endpoint). Devolvemos 200 vacío para que no rompan.
export async function GET() {
  return Response.json({ ok: true });
}
