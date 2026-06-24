'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * EVENTOS PROVIDER
 *
 * Editores ven todos (incluyendo ocultos); público ve solo visible=true.
 * La clasificación próximos/pasados se hace en el componente con la fecha.
 * CRUD: las policies RLS rechazan writes desde no-editores.
 */
const EventosContext = createContext(null);

export function EventosProvider({ children }) {
  const { isEditor, hydrated: authHydrated } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;
    loadEventos();
  }, [authHydrated, isEditor]);

  const loadEventos = async () => {
    let q = supabase
      .from('eventos')
      .select('id, nombre, fecha, image_path, descripcion, orden, visible')
      .order('fecha', { ascending: false });
    if (!isEditor) q = q.eq('visible', true);
    const { data, error } = await q;
    if (error) {
      console.error('Error cargando eventos:', error.message);
      setEventos([]);
    } else {
      setEventos(data || []);
    }
    setHydrated(true);
  };

  const createEvento = async (input) => {
    const maxOrden = eventos.reduce((m, e) => Math.max(m, e.orden ?? 0), 0);
    const { error } = await supabase
      .from('eventos')
      .insert({ ...input, orden: maxOrden + 1 });
    if (error) return { error };
    await loadEventos();
    return { error: null };
  };

  const updateEvento = async (id, patch) => {
    const { error } = await supabase
      .from('eventos')
      .update(patch)
      .eq('id', id);
    if (error) return { error };
    await loadEventos();
    return { error: null };
  };

  const deleteEvento = async (id) => {
    const { error } = await supabase.from('eventos').delete().eq('id', id);
    if (error) return { error };
    await loadEventos();
    return { error: null };
  };

  const toggleVisible = async (id) => {
    const e = eventos.find((x) => x.id === id);
    if (!e) return { error: { message: 'no encontrado' } };
    return updateEvento(id, { visible: !e.visible });
  };

  return (
    <EventosContext.Provider
      value={{
        eventos,
        hydrated,
        createEvento,
        updateEvento,
        deleteEvento,
        toggleVisible,
      }}
    >
      {children}
    </EventosContext.Provider>
  );
}

export function useEventos() {
  const ctx = useContext(EventosContext);
  if (!ctx) throw new Error('useEventos fuera de EventosProvider');
  return ctx;
}
