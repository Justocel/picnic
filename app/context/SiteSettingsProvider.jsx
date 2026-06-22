'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * SITE SETTINGS PROVIDER
 *
 * Tabla key/value en Supabase. Lectura pública (anon), escritura solo
 * editores (RLS). Cualquier key whitelisteada acá puede ser editada.
 *
 * Conviven dos familias de keys:
 *   - Originales (contacto, redes sociales): valores que no tienen fallback
 *     en código — si no están en DB, se ven como "sin configurar" en el footer.
 *   - Textos editoriales (welcome_p1..p5, pull_quote, hero_claim, footer y
 *     descripciones de sección): tienen fallback hardcoded en data.js. El
 *     componente EditableText resuelve "value de DB > fallback".
 */
const SiteSettingsContext = createContext(null);

// Whitelist de keys editables. Cualquier intento de modificar una key fuera
// de esta lista falla con error explícito (defensa en profundidad — la RLS
// del lado server ya filtra, pero esto evita typos del cliente).
const ALLOWED_KEYS = new Set([
  // Contacto y redes
  'contact_email',
  'instagram_url',
  'youtube_url',
  'whatsapp_url',
  'twitter_url',
  'tiktok_url',
  'bio_corta',
  // Textos editoriales — Hero / Welcome
  'hero_claim',
  'welcome_p1',
  'welcome_p2',
  'welcome_p3',
  'welcome_p4',
  'welcome_p5',
  'welcome_pull_quote',
  // Footer
  'footer_brand',
  'footer_tagline',
  'footer_colaboraciones',
  // Descripciones de sección (titulo + descripcion para cada una)
  'seccion_articulos_titulo',
  'seccion_articulos_descripcion',
  'seccion_eventos_proximos_titulo',
  'seccion_eventos_proximos_descripcion',
  'seccion_eventos_pasados_titulo',
  'seccion_eventos_pasados_descripcion',
  'seccion_picnic_escena_titulo',
  'seccion_picnic_escena_descripcion',
  'seccion_gracias_titulo',
  'seccion_gracias_descripcion',
  'seccion_picnic_titulo',
  'seccion_picnic_descripcion',
  'seccion_revistas_titulo',
  'seccion_revistas_descripcion',
  'seccion_equipo_titulo',
  'seccion_equipo_descripcion',
]);

export function SiteSettingsProvider({ children }) {
  const { user, isEditor } = useAuth();
  const [settings, setSettings] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value');
    if (error) {
      console.error('Error cargando site_settings:', error.message);
    } else {
      const next = {};
      for (const { key, value } of data || []) {
        next[key] = value || '';
      }
      setSettings(next);
    }
    setHydrated(true);
  };

  const updateSetting = async (key, value) => {
    if (!isEditor) {
      return { error: { message: 'Solo editores pueden modificar' } };
    }
    if (!ALLOWED_KEYS.has(key)) {
      return { error: { message: `Key desconocida: ${key}` } };
    }
    const cleaned = typeof value === 'string' ? value.trim() : '';
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: cleaned, updated_by: user?.id });
    if (error) return { error };
    setSettings((s) => ({ ...s, [key]: cleaned }));
    return { error: null };
  };

  /**
   * Helper: devuelve el valor en DB (si existe y no está vacío) o el fallback.
   * El componente EditableText lo usa internamente.
   */
  const getText = (key, fallback = '') => {
    const v = settings[key];
    return v && v.trim().length > 0 ? v : fallback;
  };

  return (
    <SiteSettingsContext.Provider
      value={{ settings, hydrated, updateSetting, getText }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings fuera de SiteSettingsProvider');
  return ctx;
}
