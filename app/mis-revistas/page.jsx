'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthProvider';
import { usePurchases } from '../context/PurchasesProvider';
import { useRevistas } from '../context/RevistasProvider';
import { supabase } from '@/lib/supabase';
import { formatDate } from '../utils/utils';

function MisRevistasContent() {
  const { user, hydrated: authReady } = useAuth();
  const { purchases, hydrated: purchasesReady } = usePurchases();
  const { getRevistaById, hydrated: revistasReady } = useRevistas();
  // Cache local de revistas que no están en el provider (porque el editor las
  // desactivó después de la compra). Sin esto el usuario perdía visibilidad
  // de sus compras aunque la policy del PDF las sigue permitiendo.
  const [extraRevistas, setExtraRevistas] = useState({});

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

  // Detectar revistas compradas que no están en el provider (desactivadas
  // por el editor) y fetcharlas directamente para no perder visibilidad.
  useEffect(() => {
    if (!purchasesReady || !revistasReady) return;
    const missing = [];
    for (const revistaId of byRevista.keys()) {
      if (!getRevistaById(revistaId) && !extraRevistas[revistaId]) {
        missing.push(revistaId);
      }
    }
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from('revistas')
        .select('id, numero_edicion, titulo, descripcion, portada_path, pdf_path')
        .in('id', missing);
      if (data?.length) {
        setExtraRevistas((cur) => {
          const next = { ...cur };
          for (const r of data) next[r.id] = r;
          return next;
        });
      }
    })();
    // byRevista se recalcula cada render: dependemos del map por su tamaño/keys
    // para no loopear. eslint-disable porque getRevistaById/extraRevistas
    // pueden cambiar identidad sin afectar la lógica del fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasesReady, revistasReady, purchases]);

  const items = Array.from(byRevista.values())
    .map((compra) => {
      const revista =
        getRevistaById(compra.revista_id) || extraRevistas[compra.revista_id];
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
              {revista.portada_path ? (
                <Image
                  src={revista.portada_path}
                  alt={`Edición ${revista.numero_edicion}`}
                  className="mis-revistas-cover"
                  width={400}
                  height={566}
                  sizes="(max-width: 700px) 100vw, 240px"
                />
              ) : (
                <div
                  className="mis-revistas-cover mis-revistas-cover--empty"
                  aria-hidden="true"
                />
              )}
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
