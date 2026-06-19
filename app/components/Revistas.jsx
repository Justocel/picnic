'use client';

import { useState, useRef } from 'react';
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

const Revista3D = dynamic(() => import('./Revista3D'), {
  ssr: false,
  loading: () => <div className="revista-3d-canvas revista-3d-fallback" />,
});

/**
 * COMPONENTE REVISTAS
 *
 * Public: muestra la primera edición activa con escena 3D y botón de compra.
 * Edit mode: lista todas las ediciones (activas e inactivas) con controles
 * CRUD inline. PDF se sube desde el modal de edición (necesita el UUID).
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
  const [editing, setEditing] = useState(null); // null | 'new' | <revista>
  const [addError, setAddError] = useState('');
  const [carouselIdx, setCarouselIdx] = useState(0);
  const touchStartX = useRef(null);

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
    // Refrescá el editing state local para que el modal muestre el nuevo path
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

  const activas = revistas.filter((r) => r.activa);

  // Carrusel: clamp del índice por si la lista cambia (ej. desactivan una edición).
  const safeIdx = activas.length === 0 ? 0 : Math.min(carouselIdx, activas.length - 1);
  const current = activas[safeIdx] || null;
  const goPrev = () =>
    setCarouselIdx((i) => (i - 1 + activas.length) % activas.length);
  const goNext = () => setCarouselIdx((i) => (i + 1) % activas.length);
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null || activas.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) (dx > 0 ? goPrev : goNext)();
    touchStartX.current = null;
  };

  return (
    <section
      id={secciones.revistas.id}
      className={`seccion-placeholder seccion-placeholder--alt${editMode ? ' seccion--edit' : ''}`}
    >
      <div className="seccion-header">
        <h1>{secciones.revistas.titulo}</h1>
        <p className="seccion-descripcion">{secciones.revistas.descripcion}</p>
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
      ) : (
        <div
          className="revistas-container revistas-container--3d"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {!hydrated && (
            <div className="revista-item revista-item--3d">
              <Revista3D />
            </div>
          )}
          {hydrated && activas.length === 0 && (
            <p className="seccion-descripcion">
              No hay revistas disponibles todavía.
            </p>
          )}
          {current && (
            <div className="revista-coverflow" data-count={activas.length}>
              {/* Thumbnails de las ediciones anteriores a la actual (a la izquierda). */}
              {activas.slice(0, safeIdx).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="revista-thumb"
                  onClick={() => setCarouselIdx(activas.indexOf(r))}
                  aria-label={`Ver Edición ${r.numero_edicion}`}
                >
                  <img
                    src={r.portada_path}
                    alt={`Edición ${r.numero_edicion}`}
                    draggable={false}
                  />
                  <span>#{r.numero_edicion}</span>
                </button>
              ))}

              {/* Slot central: 3D + título + botón. */}
              <div className="revista-item revista-item--3d revista-current">
                <Revista3D
                  key={current.id}
                  portadaPath={current.portada_path}
                />
                <h2 className="revista-current-titulo">
                  {current.titulo || `Edición ${current.numero_edicion}`}
                </h2>
                <button
                  className="revista-add-btn revista-add-btn--3d"
                  onClick={() => handleAdd(current.id)}
                  disabled={hasInCart(current.id)}
                  aria-label={
                    hasInCart(current.id)
                      ? 'Esta revista ya está en tu carrito'
                      : `Agregar Edición ${current.numero_edicion} al carrito`
                  }
                >
                  {hasInCart(current.id) ? 'En el carrito' : 'Agregar al carrito'}
                </button>
              </div>

              {/* Thumbnails de las posteriores a la actual (a la derecha). */}
              {activas.slice(safeIdx + 1).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="revista-thumb"
                  onClick={() => setCarouselIdx(activas.indexOf(r))}
                  aria-label={`Ver Edición ${r.numero_edicion}`}
                >
                  <img
                    src={r.portada_path}
                    alt={`Edición ${r.numero_edicion}`}
                    draggable={false}
                  />
                  <span>#{r.numero_edicion}</span>
                </button>
              ))}
            </div>
          )}
          {addError && <p className="cart-warning">{addError}</p>}
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
