/**
 * DATOS CENTRALIZADOS PARA PICNIC
 * Toda la información que será consumida por los componentes de Next.js.
 * Las rutas de imágenes empiezan con "/" para apuntar a /public.
 */

export const COLORS = {
  primary: '#fe3031',
  primaryDark: '#cc2929',
  secondary: '#98002b',
  light: '#fafafa',
  dark: '#333',
};

// BIENVENIDA
export const welcome = {
  paragraphs: [
    'Picnic es una revista. Cada número es una mesa puesta para artistas que el algoritmo todavía no descubrió: el taller antes que el booth, el nombre antes que el movimiento, el oficio antes que el hype.',
    'Si estás leyendo esto seguramente ya sabés dónde estás. Este es nuestro primer número y te agradecemos profundamente que lo estés leyendo. Picnic, la revista del arte fino, tiene como razón de ser la creación de contenidos periodísticos sobre arte en general. Nos gusta el cine, la música, el teatro, la pintura, la escultura, la literatura, la poesía. Todo tipo de arte.',
    '¿Por qué arte fino? Consideramos que toda expresión artística, si atraviesa un sentimiento, tiene una razón de ser. El arte fino es un tipo de arte creado principalmente con propósitos estéticos, intelectuales o emocionales, en contraposición a las artes decorativas o utilitarias.',
    'Por eso hacemos periodismo de arte fino. Nos emociona y por eso ponemos el cuerpo: vamos a lugares donde se respira arte fino, hablamos con los artistas, les hacemos toda clase de preguntas.',
    'Creemos que también es otra forma de popularizar el arte y democratizarlo. Si nadie graba esto, ¿realmente existió? Hay artistas que nos gustan tanto que queremos compartirlos con todo el mundo. Esa es la base. Sentate. Hojeá despacio. No hay apuro.',
  ],
  pullQuote: 'No somos un feed. Cada número tiene tapa, índice y final.',
  pullQuoteAfter: 1,
};

// ARTICULOS — ahora viven en la tabla articulos (Supabase). Ver ArticulosProvider.

// EVENTOS — ahora viven en la tabla eventos (Supabase). Ver EventosProvider.
// La migración 0008 sembró 6 mocks iniciales con imágenes /Eventos/1-6.png
// para que la sección no quede vacía al desplegar.

// VIDEOS — ahora viven en la tabla videos (Supabase). Ver VideosProvider.

// REVISTAS — ahora viven en la tabla revistas (Supabase). Ver RevistasProvider.

// INTEGRANTES — ahora viven en la tabla integrantes (Supabase). Ver IntegrantesProvider.

// SECCIONES - Metadata para navegación y descripciones
export const secciones = {
  hero: {
    id: 'hero',
    titulo: 'Picnic',
    subtitulo: 'La revista del arte fino',
    videoSrc: '/icon.mp4',
  },
  articulos: {
    id: 'articulos',
    titulo: 'Artículos',
    descripcion: 'Textos largos sobre obras, oficios y conversaciones de taller.',
  },
  eventosProximos: {
    id: 'eventos-proximos',
    titulo: 'Eventos próximos',
    descripcion: 'Picnics reales: lecturas, muestras, sobremesas.',
  },
  eventosPasados: {
    id: 'eventos-pasados',
    titulo: 'Eventos pasados',
    descripcion: 'Lo que ya cubrimos.',
  },
  picnicEscena: {
    id: 'picnic-en-la-escena',
    titulo: 'Picnic en la escena',
    descripcion: 'Lo que pasa cuando apagamos la cámara y seguimos hablando.',
  },
  gracias: {
    id: 'gracias-intercomunicacion',
    titulo: 'Gracias por la intercomunicación',
    descripcion: 'Conversaciones con artistas emergentes.',
  },
  picnic: {
    id: 'picnic-en-la-tierra',
    titulo: 'Picnic en la tierra',
    descripcion: 'Cobertura periodística de la escena.',
  },
  revistas: {
    id: 'consegui-tu-revista',
    titulo: 'Conseguí la revista',
    descripcion: 'Números cerrados. Cada uno se hojea entero.',
  },
  equipo: {
    id: 'quienes-somos',
    titulo: 'Quiénes Somos',
    descripcion: 'Las personas que arman cada número, una por una.',
  },
};

// NAVEGACIÓN
export const navLinks = [
  { label: 'Artículos', href: '/#articulos' },
  { label: 'Eventos próximos', href: '/#eventos-proximos' },
  { label: 'Eventos pasados', href: '/#eventos-pasados' },
  { label: 'Picnic en la escena', href: '/#picnic-en-la-escena' },
  { label: 'Conseguí la revista', href: '/#consegui-tu-revista' },
  { label: 'Quiénes Somos', href: '/#quienes-somos' },
];

// FOOTER — los links a redes sociales viven en site_settings (DB) editables
// inline por el editor. Acá quedan los textos de marca con fallback.
export const footer = {
  brand: 'Picnic',
  tagline: 'La revista del arte fino. Editada en Buenos Aires, número por número.',
  contacto: {
    email: 'contacto@picniczine.com',
    colaboraciones: 'Si hacés algo que merece una mesa, escribinos.',
  },
  copyright: 'Picniczine. Todos los derechos reservados.',
};
