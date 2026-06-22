'use client';

import Link from 'next/link';
import { useState } from 'react';
import { secciones } from '../data/data';
import { useArticulos } from '../context/ArticulosProvider';
import { useEditMode } from '../context/EditModeProvider';
import ArticuloEditModal from './ArticuloEditModal';
import EditableText from './EditableText';

function Articulos() {
  const {
    articulos,
    hydrated,
    createArticulo,
    updateArticulo,
    deleteArticulo,
    toggleVisible,
    moveUp,
    moveDown,
  } = useArticulos();
  const { editMode } = useEditMode();
  const [editing, setEditing] = useState(null); // null | 'new' | <articulo>

  const handleDelete = async (articulo) => {
    if (!confirm(`¿Borrar el artículo "${articulo.titulo}"?`)) return;
    const { error } = await deleteArticulo(articulo.id);
    if (error) alert('Error al borrar: ' + error.message);
  };

  const handleSave = async (form) => {
    if (editing === 'new') {
      return createArticulo(form);
    }
    return updateArticulo(editing.id, form);
  };

  // En modo público, ocultar la sección entera si no hay artículos visibles.
  // En edit mode se mantiene siempre visible para que el editor pueda crear el primero.
  const visiblesCount = articulos.filter((a) => a.visible).length;
  if (!editMode && hydrated && visiblesCount === 0) return null;

  return (
    <section
      id={secciones.articulos.id}
      className={`seccion-placeholder${editMode ? ' seccion--edit' : ''}`}
    >
      <div className="seccion-header">
        <EditableText
          settingKey="seccion_articulos_titulo"
          fallback={secciones.articulos.titulo}
          as="h1"
          maxLength={80}
        />
        <EditableText
          settingKey="seccion_articulos_descripcion"
          fallback={secciones.articulos.descripcion}
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
            + Nuevo artículo
          </button>
        )}
      </div>

      <div className="articulos-container">
        {hydrated && articulos.length === 0 ? (
          <p className="seccion-placeholder-vacio">
            Estamos escribiendo el próximo número. Volvé en unos días.
          </p>
        ) : (
          articulos.map((articulo, idx) => (
            <div
              key={articulo.id}
              className={`articulo-wrapper${
                !articulo.visible ? ' articulo-wrapper--hidden' : ''
              }`}
            >
              <Link
                href={`/articulos/${articulo.slug}`}
                className="articulo-card"
              >
                <img
                  src={articulo.imagen_path}
                  alt={articulo.titulo}
                  className="articulo-image"
                />
                <div className="articulo-overlay">
                  {articulo.categoria && (
                    <span className="articulo-categoria">
                      {articulo.categoria}
                    </span>
                  )}
                  <h2 className="articulo-titulo">{articulo.titulo}</h2>
                  {articulo.subtitulo && (
                    <p className="articulo-subtitulo">
                      &ldquo;{articulo.subtitulo}&rdquo;
                    </p>
                  )}
                </div>
              </Link>
              {editMode && (
                <div className="edit-controls">
                  <button
                    type="button"
                    onClick={() => moveUp(articulo.id)}
                    disabled={idx === 0}
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(articulo.id)}
                    disabled={idx === articulos.length - 1}
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisible(articulo.id)}
                    title={articulo.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {articulo.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(articulo)}
                    title="Editar"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(articulo)}
                    title="Borrar"
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
        <ArticuloEditModal
          articulo={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

export default Articulos;
