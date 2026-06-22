/**
 * UTILIDADES COMUNES
 * Funciones auxiliares reutilizables en el proyecto.
 */

export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

export const isEventFuture = (eventDate) => new Date(eventDate) > new Date();

export const classifyEvents = (events) => ({
  futuro: events.filter((e) => isEventFuture(e.fecha)),
  pasado: events.filter((e) => !isEventFuture(e.fecha)),
});

export const getYoutubeThumbnail = (url) => {
  const videoId = extractYoutubeId(url);
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const extractYoutubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const truncateText = (text, length = 100) => {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

export const createSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const classNames = (classes) =>
  Object.keys(classes)
    .filter((key) => classes[key])
    .join(' ');

/**
 * Sanitiza el parámetro `next` de los redirects post-login para evitar open
 * redirects. Solo permite paths internos (empiezan con "/" pero no "//").
 * Cualquier URL externa o protocol-relative cae al fallback "/".
 */
export const safeNextPath = (next, fallback = '/') => {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/')) return fallback; // bloquea https://, //, etc.
  if (next.startsWith('//')) return fallback; // protocol-relative → externo
  if (next.includes('://')) return fallback;
  return next;
};

/**
 * Validación de email para feedback inmediato en el cliente. Supabase Auth
 * valida de nuevo server-side; esto solo evita el round-trip si está mal.
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

