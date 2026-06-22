/**
 * Web App Manifest. Permite "Agregar a pantalla de inicio" en mobile e
 * indica colores/iconos cuando el browser muestra el sitio como app.
 * Next.js lo expone en /manifest.webmanifest.
 */
export default function manifest() {
  return {
    name: 'Picnic Magazine — La revista del arte fino',
    short_name: 'Picnic',
    description:
      'Periodismo de arte fino. Eventos, entrevistas, videos y revistas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#98002b',
    theme_color: '#fe3031',
    lang: 'es-AR',
    icons: [
      {
        src: '/icon.jpg',
        sizes: '1080x1080',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
