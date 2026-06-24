'use client';

import { useState } from 'react';
import Image from 'next/image';
import { secciones } from '../data/data';
import { formatDate, isEventFuture } from '../utils/utils';
import { useEventos } from '../context/EventosProvider';
import { useEditMode } from '../context/EditModeProvider';
import EventoEditModal from './EventoEditModal';
import EditableText from './EditableText';

/**
 * COMPONENTE EVENTS
 * Renderiza eventos próximos y pasados como dos secciones separadas.
 * En edit mode aparecen controles inline (crear/editar/ocultar/borrar) y
 * el botón "+ Nuevo evento" sobre la sección "próximos" (donde caen los
 * eventos nuevos por default si su fecha es futura).
 * Si ambas listas están vacías y NO estamos en edit mode, el componente
 * no renderiza nada (la sección desaparece de la home).
 */
function Events() {
  const {
    eventos,
    hydrated,
    createEvento,
    updateEvento,
    deleteEvento,
    toggleVisible,
  } = useEventos();
  const { editMode } = useEditMode();
  const [editing, setEditing] = useState(null);

  const futuro = eventos.filter((e) => isEventFuture(e.fecha));
  const pasado = eventos.filter((e) => !isEventFuture(e.fecha));

  if (!editMode && hydrated && eventos.length === 0) return null;

  const handleSave = async (form) => {
    if (editing === 'new') return createEvento(form);
    return updateEvento(editing.id, form);
  };

  const handleDelete = async (e) => {
    if (!confirm(`¿Borrar "${e.nombre}"?`)) return;
    const { error } = await deleteEvento(e.id);
    if (error) alert('Error al borrar: ' + error.message);
  };

  const renderEvento = (evento) => (
    <div
      key={evento.id}
      className={`evento-wrapper${
        !evento.visible ? ' evento-wrapper--hidden' : ''
      }`}
    >
      <div className="evento">
        {evento.image_path ? (
          <Image
            src={evento.image_path}
            alt={evento.nombre}
            className="flyer"
            width={400}
            height={500}
            sizes="(max-width: 700px) 80vw, 280px"
          />
        ) : (
          <div className="flyer flyer--empty" aria-hidden="true" />
        )}
        <p className="evento-nombre">{evento.nombre}</p>
        <p className="evento-fecha">{formatDate(evento.fecha)}</p>
        {evento.descripcion && (
          <p className="evento-desc">{evento.descripcion}</p>
        )}
      </div>
      {editMode && (
        <div className="edit-controls">
          <button type="button" onClick={() => toggleVisible(evento.id)}>
            {evento.visible ? 'Ocultar' : 'Mostrar'}
          </button>
          <button type="button" onClick={() => setEditing(evento)}>
            Editar
          </button>
          <button
            type="button"
            onClick={() => handleDelete(evento)}
            className="edit-delete"
          >
            Borrar
          </button>
        </div>
      )}
    </div>
  );

  // En edit mode mostramos las dos sub-secciones siempre (aunque vacías),
  // así el editor puede agregar el primer evento desde el botón "+".
  const showFuturos = editMode || futuro.length > 0;
  const showPasados = editMode || pasado.length > 0;

  return (
    <>
      {showFuturos && (
        <section
          id={secciones.eventosProximos.id}
          className={`seccion-placeholder seccion-placeholder--alt seccion-eventos${editMode ? ' seccion--edit' : ''}`}
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
            {editMode && (
              <button
                className="edit-add-btn"
                onClick={() => setEditing('new')}
                type="button"
              >
                + Nuevo evento
              </button>
            )}
          </div>
          {futuro.length === 0 ? (
            <p className="seccion-placeholder-vacio">
              {editMode
                ? 'Todavía no hay eventos próximos cargados.'
                : ''}
            </p>
          ) : (
            <div className="eventos-container eventos-container--grid">
              {futuro.map(renderEvento)}
            </div>
          )}
        </section>
      )}

      {showPasados && (
        <section
          id={secciones.eventosPasados.id}
          className={`seccion-placeholder seccion-placeholder--alt seccion-eventos${editMode ? ' seccion--edit' : ''}`}
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
          {pasado.length === 0 ? (
            <p className="seccion-placeholder-vacio">
              {editMode
                ? 'Todavía no hay eventos pasados cargados.'
                : ''}
            </p>
          ) : (
            <div className="eventos-container">{pasado.map(renderEvento)}</div>
          )}
        </section>
      )}

      {editing !== null && (
        <EventoEditModal
          evento={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default Events;
