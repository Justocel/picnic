'use client';

import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthProvider';
import { usePurchases } from '../context/PurchasesProvider';
import { useRevistas } from '../context/RevistasProvider';
import { formatDate } from '../utils/utils';

function MisRevistasContent() {
  const { user, hydrated: authReady } = useAuth();
  const { purchases, hydrated: purchasesReady } = usePurchases();
  const { getRevistaById, hydrated: revistasReady } = useRevistas();

  if (!authReady || !purchasesReady || !revistasReady) {
    return <main className="mis-revistas-page" />;
  }

  if (!user) {
    return (
      <main className="mis-revistas-page">
        <div className="mis-revistas-header">
          <h1>Mis revistas</h1>
          <p className="seccion-descripcion">
            Iniciá sesión para ver las revistas que ya compraste.
          </p>
        </div>
        <div className="mis-revistas-vacio">
          <Link href="/login?next=/mis-revistas" className="auth-submit">
            Iniciar sesión
          </Link>
          <Link
            href="/registrarme?next=/mis-revistas"
            className="auth-submit auth-submit--ghost"
          >
            Crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  // Solo revistas efectivamente compradas (estados de ownership) y deduplicadas
  // por revista_id: si por algún motivo hay más de una pagada/completada/confirmada,
  // mostramos solo la más reciente.
  const OWNED_STATES = new Set(['completada', 'pagada', 'confirmada']);
  const byRevista = new Map();
  for (const compra of purchases) {
    if (!OWNED_STATES.has(compra.estado)) continue;
    const existing = byRevista.get(compra.revista_id);
    if (!existing || existing.created_at < compra.created_at) {
      byRevista.set(compra.revista_id, compra);
    }
  }
  const items = Array.from(byRevista.values())
    .map((compra) => {
      const revista = getRevistaById(compra.revista_id);
      return revista
        ? { ...revista, fecha: compra.created_at, purchase_id: compra.id }
        : null;
    })
    .filter(Boolean);

  return (
    <main className="mis-revistas-page">
      <div className="mis-revistas-header">
        <h1>Mis revistas</h1>
        <p className="seccion-descripcion">
          Hola, {user.nombre || user.email}. Acá vas a ver todo lo que compraste.
        </p>
        <Link href="/mis-ordenes" className="auth-submit auth-submit--ghost">
          Ver historial de órdenes
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mis-revistas-vacio">
          <p>Todavía no compraste ninguna revista.</p>
          <Link href="/#consegui-tu-revista" className="auth-submit">
            Ver revistas disponibles
          </Link>
        </div>
      ) : (
        <div className="mis-revistas-grid">
          {items.map((revista) => (
            <article key={revista.purchase_id} className="mis-revistas-card">
              <img
                src={revista.portada_path}
                alt={`Edición ${revista.numero_edicion}`}
                className="mis-revistas-cover"
              />
              <div className="mis-revistas-info">
                <h2>{revista.titulo || `Edición ${revista.numero_edicion}`}</h2>
                <p className="mis-revistas-fecha">
                  Comprada el {formatDate(revista.fecha)}
                </p>
                <div className="mis-revistas-acciones">
                  <Link href={`/leer/${revista.id}`} className="auth-submit">
                    Leer revista
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default function MisRevistasPage() {
  return (
    <>
      <Header />
      <MisRevistasContent />
      <Footer />
    </>
  );
}
