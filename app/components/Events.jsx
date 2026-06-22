'use client';

import { eventos, secciones } from '../data/data';
import { classifyEvents, formatDate } from '../utils/utils';
import EditableText from './EditableText';

/**
 * COMPONENTE EVENTS
 * Renderiza eventos próximos y pasados como dos secciones separadas.
 * Cada sub-sección se oculta si no tiene eventos; si ambas están vacías,
 * el componente entero no renderiza nada (no hay edit mode para eventos).
 */
function Events() {
  const { futuro, pasado } = classifyEvents(eventos);

  if (futuro.length === 0 && pasado.length === 0) return null;

  const renderEvento = (evento) => (
    <div key={evento.id} className="evento">
      <img src={evento.image} alt={evento.nombre} className="flyer" />
      <p className="evento-nombre">{evento.nombre}</p>
      <p className="evento-fecha">{formatDate(evento.fecha)}</p>
    </div>
  );

  return (
    <>
      {futuro.length > 0 && (
        <section
          id={secciones.eventosProximos.id}
          className="seccion-placeholder seccion-placeholder--alt seccion-eventos"
        >
          <div className="seccion-header">
            <EditableText
              settingKey="seccion_eventos_proximos_titulo"
              fallback={secciones.eventosProximos.titulo}
              as="h1"
              maxLength={80}
            />
            <EditableText
              settingKey="seccion_eventos_proximos_descripcion"
              fallback={secciones.eventosProximos.descripcion}
              as="p"
              className="seccion-descripcion"
              maxLength={300}
            />
          </div>
          <div className="eventos-container eventos-container--grid">
            {futuro.map(renderEvento)}
          </div>
        </section>
      )}

      {pasado.length > 0 && (
        <section
          id={secciones.eventosPasados.id}
          className="seccion-placeholder seccion-placeholder--alt seccion-eventos"
        >
          <div className="seccion-header">
            <EditableText
              settingKey="seccion_eventos_pasados_titulo"
              fallback={secciones.eventosPasados.titulo}
              as="h1"
              maxLength={80}
            />
            <EditableText
              settingKey="seccion_eventos_pasados_descripcion"
              fallback={secciones.eventosPasados.descripcion}
              as="p"
              className="seccion-descripcion"
              maxLength={300}
            />
          </div>
          <div className="eventos-container">{pasado.map(renderEvento)}</div>
        </section>
      )}
    </>
  );
}

export default Events;
