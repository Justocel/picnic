import { createClient } from '@supabase/supabase-js';

/**
 * CRON: keep-alive de Supabase.
 *
 * El plan free de Supabase PAUSA el proyecto tras 7 días sin actividad en la
 * base. Un proyecto pausado deja de responder queries → la app se cae hasta
 * que alguien lo despausa manualmente desde el dashboard.
 *
 * Este endpoint hace una query trivial (un SELECT liviano) para registrar
 * actividad. Vercel Cron lo dispara a diario (ver vercel.json), muy por
 * debajo del umbral de 7 días.
 *
 * Auth: Vercel inyecta `Authorization: Bearer <CRON_SECRET>` cuando la env
 * var está seteada. Sin ese header → 401 (evita que cualquiera lo gatille).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return Response.json(
      { error: 'Falta config de Supabase' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });

  // Query mínima: contar filas de una tabla chica. Suficiente para que
  // Supabase registre la actividad y no pause el proyecto.
  const { error } = await supabase
    .from('site_settings')
    .select('key', { count: 'exact', head: true });

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, pinged: 'site_settings' });
}
