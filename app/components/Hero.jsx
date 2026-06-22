import { secciones } from '../data/data';

/**
 * COMPONENTE HERO
 * Sección con video de fondo. El h1 va sr-only — el branding visible
 * ya está en el header arriba; el h1 sigue ahí por SEO y a11y.
 */
function Hero() {
  return (
    <section
      id={secciones.hero.id}
      className="seccion-hero"
      aria-label={`${secciones.hero.titulo} — ${secciones.hero.subtitulo}`}
    >
      <h1 className="sr-only">
        {secciones.hero.titulo} — {secciones.hero.subtitulo}
      </h1>
      <video autoPlay muted loop playsInline className="hero-video">
        <source src={secciones.hero.videoSrc} type="video/mp4" />
      </video>
    </section>
  );
}

export default Hero;
