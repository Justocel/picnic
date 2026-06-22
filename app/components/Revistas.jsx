'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { secciones } from '../data/data';
import { useAuth } from '../context/AuthProvider';
import { useCart } from '../context/CartProvider';
import { useRevistas } from '../context/RevistasProvider';
import { useEditMode } from '../context/EditModeProvider';
import { trackEvent } from '@/lib/analytics';
import { friendlyCartError } from '@/lib/errorMessages';
import RevistaEditModal from './RevistaEditModal';

const RevistasShelf3D = dynamic(() => import('./RevistasShelf3D'), {
  ssr: false,
  loading: () => <div className="revistas-shelf-canvas revistas-shelf-fallback" />,
});

/**
 * COMPONENTE REVISTAS
 *
 * Modo público:
 *   - Estado "explorar": todas las revistas paralelas en el shelf 3D, mismo
 *     tratamiento. Hover destaca apenas (Z+, scale+), drag horizontal rota.
 *   - Estado "seleccionada" (al hacer click): la revista clickeada se centra
 *     y agranda; las hermanas se esfuman. Aparece dim overlay + panel con
 *     título, descripción y botón comprar.
 *   - Click overlay / ESC / click en la misma revista → vuelve a "explorar".
 */
function Revistas() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    revistas,
    hydrated,
    createRevista,
    updateRevista,
    deleteRevista,
    toggleActiva,
  } = useRevistas();
  const { addToCart, setShowCart, hasInCart } = useCart();
  const { editMode } = useEditMode();
  const [editing, setEditing] = useState(null);
  const [addError, setAddError] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const activas = revistas.filter((r) => r.activa);
  const selected = selectedId ? activas.find((r) => r.id === selectedId) : null;

  // ESC deselecciona.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // Si la revista seleccionada se vuelve inactiva (editor la desactivó),
  // cerramos el panel.
  useEffect(() => {
    if (selectedId && !activas.find((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [activas, selectedId]);

  // Mientras hay una revista seleccionada, bloqueamos el scroll del body
  // para que el usuario no scrollee fuera del modo "foco" (con el dim activo).
  useEffect(() => {
    if (!selectedId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedId]);

  const handleAdd = async (revistaId) => {
    if (!user) {
      router.push('/login?next=/');
      return;
    }
    setAddError('');
    const { error } = await addToCart(revistaId);
    if (error) {
      setAddError(friendlyCartError(error));
      return;
    }
    trackEvent('add_to_cart', {
      userId: user.id,
      metadata: { revista_id: revistaId },
    });
    setShowCart(true);
  };

  const handleSave = async (payload) => {
    if (editing === 'new') return createRevista(payload);
    return updateRevista(editing.id, payload);
  };

  const handlePdfUploaded = async (revistaId, newPath) => {
    await updateRevista(revistaId, { pdf_path: newPath });
    setEditing((cur) =>
      cur && cur !== 'new' && cur.id === revistaId
        ? { ...cur, pdf_path: newPath }
        : cur
    );
  };

  const handleDelete = async (r) => {
    if (
      !confirm(
        `¿Borrar la edición #${r.numero_edicion}? Si ya tiene compras esto va a fallar (FK).`
      )
    )
      return;
    const { error } = await deleteRevista(r.id);
    if (error) {
      alert(
        'No se pudo borrar: ' +
          error.message +
          '\nTip: marcala como "inactiva" en vez de borrarla.'
      );
    }
  };

  return (
    <section
      id={secciones.revistas.id}
      className={`seccion-placeholder seccion-placeholder--alt seccion-revistas-public${editMode ? ' seccion--edit' : ''}${selected ? ' seccion-revistas-public--selected' : ''}`}
    >
      <div className="seccion-header">
        <h1>{secciones.revistas.titulo}</h1>
        <p className="seccion-descripcion">
          {selected
            ? ''
            : 'Tocá una revista para ver el detalle. Arrastrá para girarla.'}
        </p>
        {editMode && (
          <button
            className="edit-add-btn"
            onClick={() => setEditing('new')}
            type="button"
          >
            + Nueva edición
          </button>
        )}
      </div>

      {editMode ? (
        <div className="revistas-admin-list">
          {hydrated && revistas.length === 0 && (
            <p className="seccion-descripcion">No hay ediciones aún.</p>
          )}
          {revistas.map((r) => (
            <article
              key={r.id}
              className={`revista-admin-card${!r.activa ? ' revista-admin-card--inactive' : ''}`}
            >
              {r.portada_path ? (
                <img
                  src={r.portada_path}
                  alt={`Edición ${r.numero_edicion}`}
                  className="revista-admin-portada"
                />
              ) : (
                <div className="revista-admin-portada revista-admin-portada--empty">
                  Sin portada
                </div>
              )}
              <div className="revista-admin-info">
                <h3>
                  #{r.numero_edicion} — {r.titulo}
                </h3>
                <p className="revista-admin-meta">
                  ${r.precio} ·{' '}
                  {r.activa ? 'Activa' : 'Inactiva'} ·{' '}
                  {r.pdf_path ? 'PDF ✓' : 'Sin PDF'}
                </p>
                {r.descripcion && (
                  <p className="revista-admin-desc">{r.descripcion}</p>
                )}
              </div>
              <div className="edit-controls">
                <button type="button" onClick={() => toggleActiva(r.id)}>
                  {r.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" onClick={() => setEditing(r)}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="edit-delete"
                >
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : activas.length === 0 && hydrated ? (
        <div className="revistas-shelf-empty">
          <p>No hay revistas disponibles todavía.</p>
        </div>
      ) : (
        <div className="revistas-shelf-wrapper">
          {/* Dim overlay del fondo cuando hay selected. Click sobre él deselecciona. */}
          {selected && (
            <div
              className="revistas-dim-overlay"
              onClick={() => setSelectedId(null)}
              aria-hidden="true"
            />
          )}

          {/* Botón cerrar prominente cuando hay selected. */}
          {selected && (
            <button
              type="button"
              className="revistas-close-btn"
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar y volver al catálogo"
            >
              <span aria-hidden="true">✕</span>
              <span className="revistas-close-btn-label">Volver</span>
            </button>
          )}

          <RevistasShelf3D
            revistas={activas}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />

          <div
            className={`revistas-shelf-info${selected ? ' revistas-shelf-info--visible' : ''}`}
            aria-hidden={!selected}
          >
            <h2 className="revistas-shelf-titulo">
              {selected
                ? selected.titulo || `Edición #${selected.numero_edicion}`
                : ''}
            </h2>
            {selected?.descripcion && (
              <p className="revistas-shelf-desc">{selected.descripcion}</p>
            )}
            {selected && (
              <button
                type="button"
                className="revista-add-btn revista-add-btn--3d"
                onClick={() => handleAdd(selected.id)}
                disabled={hasInCart(selected.id)}
              >
                {hasInCart(selected.id)
                  ? 'En el carrito'
                  : `Agregar — $${selected.precio}`}
              </button>
            )}
            {selected && addError && (
              <p className="cart-warning">{addError}</p>
            )}
          </div>
        </div>
      )}

      {editing !== null && (
        <RevistaEditModal
          revista={editing === 'new' ? null : editing}
          onSave={handleSave}
          onPdfUploaded={handlePdfUploaded}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

export default Revistas;
