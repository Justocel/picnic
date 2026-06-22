'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * SITE SETTINGS PROVIDER
 *
 * Tabla key/value en Supabase: contact_email, instagram_url, youtube_url,
 * whatsapp_url, twitter_url, bio_corta. Lectura pública (anon), escritura
 * solo editores (controlado por RLS).
 *
 * El cliente lee TODAS las keys en un único query al mount. Editores tienen
 * `updateSetting(key, value)` para grabar cambios.
 */
const SiteSettingsContext = createContext(null);

const DEFAULTS = {
  contact_email: '',
  instagram_url: '',
  youtube_url: '',
  whatsapp_url: '',
  twitter_url: '',
  bio_corta: '',
};

export function SiteSettingsProvider({ children }) {
  const { user, isEditor } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
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
      const next = { ...DEFAULTS };
      for (const { key, value } of data || []) {
        if (key in next) next[key] = value || '';
      }
      setSettings(next);
    }
    setHydrated(true);
  };

  const updateSetting = async (key, value) => {
    if (!isEditor) {
      return { error: { message: 'Solo editores pueden modificar' } };
    }
    if (!(key in DEFAULTS)) {
      return { error: { message: `Key desconocida: ${key}` } };
    }
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: (value || '').trim(), updated_by: user?.id })
      .eq('key', key);
    if (error) return { error };
    setSettings((s) => ({ ...s, [key]: value || '' }));
    return { error: null };
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, hydrated, updateSetting }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings fuera de SiteSettingsProvider');
  return ctx;
}
