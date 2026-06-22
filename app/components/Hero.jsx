import { secciones } from '../data/data';

/**
 * COMPONENTE HERO
 * Video de fondo + claim editorial visible.
 * Si el video falla por cualquier razón, el claim sigue siendo el primer
 * elemento legible del sitio.
 */
function Hero() {
  return (
    <section
      id={secciones.hero.id}
      className="seccion-hero"
      aria-label={`${secciones.hero.titulo} — ${secciones.hero.subtitulo}`}
    >
      <video autoPlay muted loop playsInline className="hero-video" aria-hidden="true">
        <source src={secciones.hero.videoSrc} type="video/mp4" />
      </video>
      <div className="hero-overlay" aria-hidden="true" />
      <h1 className="hero-titulo">{secciones.hero.claim}</h1>
    </section>
  );
}

export default Hero;
