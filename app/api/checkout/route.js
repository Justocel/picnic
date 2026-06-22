import { createClient } from '@supabase/supabase-js';
import { getPreferenceClient } from '@/lib/mercadopago';

/**
 * POST /api/checkout
 *
 * Crea una orden pendiente en la DB y la preferencia en Mercado Pago.
 * El cliente recibe `init_point` y se redirige al checkout de MP.
 *
 * Auth: el cliente manda Authorization: Bearer <JWT de Supabase>. Acá creamos
 * un cliente Supabase con ese JWT seteado para que la RPC crear_orden_completa
 * vea auth.uid() correctamente.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseAnon) {
    return Response.json({ error: 'Config Supabase faltante' }, { status: 500 });
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    return Response.json({ error: 'Falta MP_ACCESS_TOKEN' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Cliente Supabase actuando en nombre del user (auth.uid() funciona en la RPC).
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });

  // Validar user.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return Response.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  const user = userData.user;

  // 1) Leer carrito + revistas (para armar items de la preferencia).
  const { data: cartRows, error: cartErr } = await supabase
    .from('cart_items')
    .select('revista_id, revistas:revistas!inner(id, titulo, numero_edicion, precio, activa)')
    .eq('user_id', user.id);

  if (cartErr) {
    return Response.json({ error: `DB: ${cartErr.message}` }, { status: 500 });
  }

  const items = (cartRows || [])
    .map((r) => r.revistas)
    .filter((r) => r && r.activa);

  if (items.length === 0) {
    return Response.json({ error: 'Carrito vacío' }, { status: 400 });
  }

  // 2) Crear orden pendiente vía RPC (atómico).
  const { data: orderData, error: orderErr } = await supabase.rpc('crear_orden_completa', {
    p_metodo_pago: 'mercadopago',
  });

  if (orderErr) {
    return Response.json(
      { error: `Orden: ${orderErr.message}`, code: orderErr.code },
      { status: 400 }
    );
  }

  const orderId = orderData?.order_id;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    console.error('[checkout] orderId inválido', { orderData });
    return Response.json({ error: 'order_id inválido' }, { status: 500 });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[checkout] preference base', {
      orderId,
      items: items.length,
      siteUrl,
    });
  }

  // 3) Crear preferencia en MP.
  const preferenceClient = getPreferenceClient();

  const preferenceBody = {
    items: items.map((r) => ({
      id: r.id,
      title: r.titulo || `Picnic — Edición ${r.numero_edicion}`,
      quantity: 1,
      unit_price: Number(r.precio),
      currency_id: 'ARS',
    })),
    payer: {
      email: user.email,
    },
    back_urls: {
      success: `${siteUrl}/pago/exito?order_id=${orderId}`,
      pending: `${siteUrl}/pago/pendiente?order_id=${orderId}`,
      failure: `${siteUrl}/pago/error?order_id=${orderId}`,
    },
    auto_return: 'approved',
    external_reference: orderId,
    notification_url: `${siteUrl}/api/webhook/mp`,
    statement_descriptor: 'PICNIC',
  };

  let preference;
  try {
    preference = await preferenceClient.create({ body: preferenceBody });
  } catch (err) {
    console.error('MP createPreference error:', err);
    return Response.json(
      { error: 'No se pudo iniciar el pago en Mercado Pago' },
      { status: 502 }
    );
  }

  return Response.json({
    order_id: orderId,
    preference_id: preference.id,
    init_point: preference.init_point,
    sandbox_init_point: preference.sandbox_init_point,
  });
}
