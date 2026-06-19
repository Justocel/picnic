import './globals.css';
import Providers from './providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://picniczine.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Picnic — La revista del arte fino',
  description:
    'Picnic Magazine: periodismo de arte fino. Eventos, entrevistas, videos y revistas.',
  openGraph: {
    title: 'Picnic — La revista del arte fino',
    description:
      'Periodismo de arte fino. Eventos, entrevistas, videos y revistas.',
    url: SITE_URL,
    siteName: 'Picnic',
    images: [{ url: '/icon.jpg', width: 1200, height: 1200, alt: 'Picnic' }],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Picnic — La revista del arte fino',
    description:
      'Periodismo de arte fino. Eventos, entrevistas, videos y revistas.',
    images: ['/icon.jpg'],
  },
  icons: { icon: '/icon.jpg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
