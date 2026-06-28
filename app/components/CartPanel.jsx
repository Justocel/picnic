'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthProvider';
import { useCart } from '../context/CartProvider';
import { useRevistas } from '../context/RevistasProvider';
import { trackEvent } from '@/lib/analytics';
import { friendlyCartError } from '@/lib/errorMessages';

function CartPanel() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { getRevistaById } = useRevistas();
  const {
    cart,
    removeFromCart,
    refreshCart,
    showCart,
    setShowCart,
  } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  if (!showCart || cart.length === 0) return null;

  const items = cart
    .map((c) => {
      const revista = getRevistaById(c.revista_id);
      return revista ? { ...revista, revista_id: c.revista_id } : null;
    })
    .filter(Boolean);

  const unavailableCount = cart.length - items.length;
  const total = items.reduce((acc, r) => acc + Number(r.precio || 0), 0);

  const handleCheckout = async () => {
    if (!user || !session) {
      setShowCart(false);
      router.push('/login?next=/mis-revistas');
      return;
    }
    setError('');
    setCheckingOut(true);
    try {
      // Pide al server crear la preferencia de MP. El RPC marca las purchases
      // como 'pendiente' (no se vacía el carrito hasta que llega el webhook).
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(friendlyCartError({ code: data.code, message: data.error }));
        setCheckingOut(false);
        return;
      }
      trackEvent('purchase', {
        userId: user.id,
        metadata: {
          order_id: data.order_id,
          preference_id: data.preference_id,
          total,
        },
      });
      await refreshCart();
      // Redirigir al checkout de MP. En sandbox/test el init_point ya es de prueba.
      window.location.href = data.init_point;
    } catch (err) {
      console.error('checkout error:', err);
      setError(friendlyCartError(err));
      setCheckingOut(false);
    }
  };

  return (
    <div className="cart-panel" role="dialog" aria-label="Carrito de compras">
      <div className="cart-panel-header">
        <h2>Tu Carrito</h2>
        <button
          className="cart-close-btn"
          onClick={() => setShowCart(false)}
          aria-label="Cerrar carrito"
        >
          ✕
        </button>
      </div>
      <div className="cart-items">
        {items.map((revista) => (
          <div key={revista.revista_id} className="cart-item">
            {revista.portada_path ? (
              <Image
                src={revista.portada_path}
                alt={`Edición ${revista.numero_edicion}`}
                className="cart-item-img"
                width={120}
                height={160}
                sizes="80px"
              />
            ) : (
              <div
                className="cart-item-img cart-item-img--empty"
                aria-hidden="true"
              />
            )}
            <div className="cart-item-info">
              <p className="cart-item-title">
                {revista.titulo || `Edición ${revista.numero_edicion}`}
              </p>
              <p className="cart-item-price">${revista.precio}</p>
            </div>
            <button
              className="cart-remove-btn"
              onClick={() => removeFromCart(revista.revista_id)}
              aria-label={`Eliminar Edición ${revista.numero_edicion}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <strong>Total: ${total}</strong>
      </div>
      {unavailableCount > 0 && (
        <p className="cart-warning">
          {unavailableCount === 1
            ? '1 revista de tu carrito ya no está disponible y no se va a comprar.'
            : `${unavailableCount} revistas de tu carrito ya no están disponibles y no se van a comprar.`}
        </p>
      )}
      {error && <p className="auth-error">{error}</p>}
      <button
        className="cart-checkout-btn"
        onClick={handleCheckout}
        disabled={checkingOut}
      >
        {checkingOut
          ? 'Procesando…'
          : user
            ? 'Pagar con Mercado Pago'
            : 'Iniciar sesión para comprar'}
      </button>
    </div>
  );
}

export default CartPanel;
