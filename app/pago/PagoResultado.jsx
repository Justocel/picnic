'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartProvider';
import { usePurchases } from '../context/PurchasesProvider';

/**
 * Componente compartido para las páginas /pago/exito, /pendiente, /error.
 *
 * Cuando el user vuelve del checkout de MP, el webhook server-side puede
 * tardar 2-30s en marcar la purchase como 'pagada'. Esta página reintenta
 * `reloadPurchases()` cada 2s hasta 5 veces para que cuando el user
 * navegue a /mis-revistas, la compra esté ya reflejada localmente.
 */
export default function PagoResultado({ titulo, subtitulo, mensaje, variant, primaryHref, primaryText }) {
  const { refreshCart } = useCart();
  const { hydrated: purchasesHydrated, reloadPurchases } = usePurchases();
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      await refreshCart();
      await reloadPurchases();
      attempts++;
      if (attempts < 5 && !cancelled) {
        setTimeout(tick, 2000);
      } else if (!cancelled) {
        setRefreshing(false);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [refreshCart, reloadPurchases]);

  return (
    <>
      <Header />
      <main className="mis-revistas-page">
        <div className={`pago-resultado pago-resultado--${variant}`}>
          <h1>{titulo}</h1>
          {subtitulo && <p className="pago-resultado-sub">{subtitulo}</p>}
          {mensaje && <p className="pago-resultado-msg">{mensaje}</p>}
          <div className="pago-resultado-actions">
            <Link href={primaryHref} className="auth-submit">
              {primaryText}
            </Link>
            <Link href="/" className="auth-submit auth-submit--ghost">
              Volver al inicio
            </Link>
          </div>
          {(refreshing || !purchasesHydrated) && (
            <p className="pago-resultado-loading">Actualizando tu cuenta…</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
