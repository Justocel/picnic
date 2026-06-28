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

/**
 * Sanitiza href de un link editable (footer social URLs, contacto email).
 * Sin esto, un editor (o cuenta comprometida vía token de invitación) puede
 * meter `javascript:fetch(...)` o `data:text/html,...` y robar sesión de
 * cualquier visitante. Whitelist estricta:
 *   - isMailto=true: solo emails con formato válido → mailto:<email>
 *   - isMailto=false: solo http: / https:
 * Devuelve string seguro para usar como href, o null si no pasa.
 */
export const safeHref = (v, isMailto = false) => {
  if (!v || typeof v !== 'string') return null;
  if (isMailto) {
    const trimmed = v.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
    return `mailto:${trimmed}`;
  }
  try {
    const url = new URL(v);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

/**
 * Decodifica las entidades HTML más comunes. YouTube devuelve títulos con
 * `&quot;`, `&amp;`, `&#39;` literales — React no los decodifica al
 * renderizar, así que los limpiamos antes (al guardar en DB o al pintar).
 */
const HTML_ENTITIES = {
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};
export const decodeHtmlEntities = (s) => {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  // Fallback genérico: &#NNN; → char(NNN)
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  return out;
};

