'use client';

import { useEffect, useState } from 'react';

/**
 * useMobile — devuelve true si el viewport es ≤ breakpoint (default 700px).
 *
 * Empieza en false para evitar mismatch de hidratación entre server y client.
 * Después del primer effect, se sincroniza con matchMedia.
 */
export default function useMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
