'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * PURCHASES PROVIDER — cache de las purchases del usuario logueado.
 *
 * Se rehidrata cuando cambia el user. Después de un pago real, la
 * confirmación viene por webhook server-side; el cliente puede llamar
 * `reloadPurchases()` para reflejar el cambio (ej. desde /pago/exito).
 */
const PurchasesContext = createContext(null);

export function PurchasesProvider({ children }) {
  const { user, hydrated: authHydrated } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;
    if (!user) {
      setPurchases([]);
      setHydrated(true);
      return;
    }
    loadPurchases();
  }, [authHydrated, user?.id]);

  const loadPurchases = async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select('id, revista_id, order_id, precio_pagado, estado, metodo_pago, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error cargando compras:', error.message);
      setPurchases([]);
    } else {
      setPurchases(data || []);
    }
    setHydrated(true);
  };

  // Solo cuenta como "comprada" si está en estado de ownership. Una purchase
  // 'pendiente' (esperando webhook) o 'cancelada' no habilita acceso al PDF.
  const OWNED_STATES = new Set(['completada', 'pagada', 'confirmada']);
  const hasPurchase = (revistaId) =>
    purchases.some((p) => p.revista_id === revistaId && OWNED_STATES.has(p.estado));

  return (
    <PurchasesContext.Provider
      value={{
        purchases,
        hydrated,
        hasPurchase,
        reloadPurchases: loadPurchases,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases fuera de PurchasesProvider');
  return ctx;
}
