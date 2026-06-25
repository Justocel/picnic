import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: articulo } = await supabase
    .from('articulos')
    .select('titulo, subtitulo')
    .eq('slug', slug)
    .eq('visible', true)
    .maybeSingle();
  if (!articulo) return { title: 'Picnic' };
  return {
    title: `${articulo.titulo} — Picnic`,
    description: articulo.subtitulo || undefined,
  };
}

export default async function ArticuloPage({ params }) {
  const { slug } = await params;
  const { data: articulo, error } = await supabase
    .from('articulos')
    .select('categoria, titulo, subtitulo, contenido, imagen_path, autor, fecha_publicacion')
    .eq('slug', slug)
    .eq('visible', true)
    .maybeSingle();

  if (error || !articulo) notFound();

  return (
    <div className="App">
      <header className="cuerpo">
        <h2>Picnic</h2>
        {articulo.categoria && <h1>{articulo.categoria}</h1>}
      </header>

      <nav className="subheader" aria-label="Navegación interna">
        <Link href="/">← Volver</Link>
      </nav>

      <article className="articulo-detalle">
        {articulo.imagen_path && (
          <Image
            src={articulo.imagen_path}
            alt={articulo.titulo}
            className="articulo-detalle-image"
            width={1200}
            height={800}
            sizes="(max-width: 700px) 100vw, 900px"
            priority
          />
        )}
        <div className="articulo-detalle-contenido">
          <h1 className="articulo-detalle-titulo">{articulo.titulo}</h1>
          {articulo.subtitulo && (
            <p className="articulo-detalle-subtitulo">
              &ldquo;{articulo.subtitulo}&rdquo;
            </p>
          )}
          <p className="articulo-detalle-cuerpo">{articulo.contenido}</p>
        </div>
      </article>
    </div>
  );
}
