import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  title: 'Página no encontrada — Picnic',
  description: 'La página que buscás no existe.',
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="error-page">
        <div className="error-content">
          <h1 className="error-code">404</h1>
          <h2 className="error-title">Acá no hay Picnic</h2>
          <p className="error-message">
            La página que buscás no existe o se mudó a otro lugar.
          </p>
          <div className="error-actions">
            <Link href="/" className="auth-submit">
              Volver al inicio
            </Link>
            <Link
              href="/#consegui-tu-revista"
              className="auth-submit auth-submit--ghost"
            >
              Ver revistas
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
