/**
 * robots.txt generado por Next.js. Bloqueamos rutas privadas y de admin
 * para que ningún crawler las indexe (no aportan SEO y exponen UI interna).
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://picniczine.vercel.app';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/leer/',
          '/mis-revistas',
          '/mis-ordenes',
          '/pago/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
