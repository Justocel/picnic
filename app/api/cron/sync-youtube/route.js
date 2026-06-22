import { createClient } from '@supabase/supabase-js';
import { decodeHtmlEntities } from '@/app/utils/utils';

/**
 * CRON: sincroniza los últimos 20 videos del canal de YouTube con la tabla
 * videos. Vercel Cron lo dispara según la schedule definida en vercel.json.
 *
 * Auth: Vercel inyecta `Authorization: Bearer <CRON_SECRET>` automáticamente
 * cuando CRON_SECRET está seteada como env var. Cualquier request sin ese
 * header devuelve 401.
 *
 * Upsert preserva visible/seccion/orden (no los incluye en el row), así que
 * las decisiones manuales de los editores no se pisan al sincronizar.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const YT_MAX_RESULTS = 20;

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ytApiKey = process.env.YOUTUBE_API_KEY;
  const ytChannelId = process.env.YOUTUBE_CHANNEL_ID;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

  if (!ytApiKey || !ytChannelId) {
    return Response.json(
      { error: 'Falta YOUTUBE_API_KEY o YOUTUBE_CHANNEL_ID' },
      { status: 500 }
    );
  }
  if (!supabaseUrl || !supabaseSecret) {
    return Response.json(
      { error: 'Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY' },
      { status: 500 }
    );
  }

  const ytUrl =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&channelId=${encodeURIComponent(ytChannelId)}` +
    `&maxResults=${YT_MAX_RESULTS}&order=date&type=video` +
    `&key=${encodeURIComponent(ytApiKey)}`;

  const ytResp = await fetch(ytUrl, { cache: 'no-store' });
  if (!ytResp.ok) {
    const text = await ytResp.text();
    return Response.json(
      { error: `YouTube API: ${ytResp.status}`, detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
  const ytData = await ytResp.json();

  const rows = (ytData.items || [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      youtube_id: item.id.videoId,
      // YouTube devuelve titles con entidades HTML ya escapadas (&quot;,
      // &amp;, etc). Las decodificamos antes de guardar para que en la UI
      // se vean limpias sin tener que decodificar en cada render.
      titulo: decodeHtmlEntities(item.snippet?.title) || '(sin título)',
      descripcion: decodeHtmlEntities(item.snippet?.description) || null,
      thumbnail_url:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        null,
      published_at: item.snippet?.publishedAt || null,
      last_synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return Response.json({ synced: 0, note: 'YouTube no devolvió videos' });
  }

  // Service role: bypassea RLS. Solo en este endpoint server-side.
  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from('videos')
    .upsert(rows, { onConflict: 'youtube_id' });

  if (error) {
    return Response.json(
      { error: `DB upsert: ${error.message}` },
      { status: 500 }
    );
  }

  return Response.json({ synced: rows.length });
}
