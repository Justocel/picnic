/**
 * Sitemap generado dinámicamente. Next.js lo expone en /sitemap.xml.
 * Solo incluimos páginas públicas — las de auth/admin/lector quedan fuera
 * porque no aportan SEO y algunas requieren auth.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://picniczine.vercel.app';

export default function sitemap() {
  const lastModified = new Date();
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/registrarme`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
