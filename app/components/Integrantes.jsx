'use client';

import { useState } from 'react';
import Image from 'next/image';
import { secciones } from '../data/data';
import { useIntegrantes } from '../context/IntegrantesProvider';
import { useEditMode } from '../context/EditModeProvider';
import IntegranteEditModal from './IntegranteEditModal';
import EditableText from './EditableText';

/**
 * COMPONENTE INTEGRANTES
 * Lista el equipo desde la DB. En edit mode, controles inline (CRUD).
 */
function Integrantes() {
  const {
    integrantes,
    hydrated,
    createIntegrante,
    updateIntegrante,
    deleteIntegrante,
    toggleVisible,
    moveUp,
    moveDown,
  } = useIntegrantes();
  const { editMode } = useEditMode();
  const [editing, setEditing] = useState(null);

  const handleDelete = async (i) => {
    if (!confirm(`¿Borrar a "${i.nombre}"?`)) return;
    const { error } = await deleteIntegrante(i.id);
    if (error) alert('Error al borrar: ' + error.message);
  };

  const handleSave = async (form) => {
    if (editing === 'new') return createIntegrante(form);
    return updateIntegrante(editing.id, form);
  };

  const visiblesCount = integrantes.filter((i) => i.visible).length;
  if (!editMode && hydrated && visiblesCount === 0) return null;

  return (
    <section
      id={secciones.equipo.id}
      className={`seccion-placeholder seccion-final${editMode ? ' seccion--edit' : ''}`}
    >
      <div className="seccion-header">
        <EditableText
          settingKey="seccion_equipo_titulo"
          fallback={secciones.equipo.titulo}
          as="h2"
          maxLength={80}
        />
        <EditableText
          settingKey="seccion_equipo_descripcion"
          fallback={secciones.equipo.descripcion}
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
            + Nuevo integrante
          </button>
        )}
      </div>
      <div className="integrantes-container">
        {hydrated && integrantes.length === 0 ? (
          <p className="seccion-placeholder-vacio">
            Pronto les presentamos al equipo, uno por uno.
          </p>
        ) : (
          integrantes.map((i, idx) => (
            <div
              key={i.id}
              className={`integrante-wrapper${
                !i.visible ? ' integrante-wrapper--hidden' : ''
              }`}
            >
              <div className="integrante">
                {i.foto_path ? (
                  <Image
                    src={i.foto_path}
                    alt={i.nombre}
                    className="integrante-img"
                    width={400}
                    height={400}
                    sizes="(max-width: 700px) 50vw, 200px"
                  />
                ) : (
                  <div
                    className="integrante-img integrante-img--empty"
                    aria-hidden="true"
                  />
                )}
                <div className="info">
                  <h3>{i.nombre}</h3>
                  {i.rol && <p className="integrante-rol">{i.rol}</p>}
                  {i.bio && <p>{i.bio}</p>}
                </div>
              </div>
              {editMode && (
                <div className="edit-controls">
                  <button
                    type="button"
                    onClick={() => moveUp(i.id)}
                    disabled={idx === 0}
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i.id)}
                    disabled={idx === integrantes.length - 1}
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisible(i.id)}
                  >
                    {i.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" onClick={() => setEditing(i)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="edit-delete"
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editing !== null && (
        <IntegranteEditModal
          integrante={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

export default Integrantes;
