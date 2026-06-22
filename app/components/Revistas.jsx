'use client';

import { useMemo, useState } from 'react';
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
 * Modo público: stage adaptativa al número de ediciones activas. Una sola edición
 * es la "activa" — se renderiza en 3D al centro; las demás son thumbnails 2D
 * clickables que la reemplazan al ser tocadas. Sin flechas, sin dots.
 *
 * Modo edición: lista todas las ediciones (activas e inactivas) con controles
 * CRUD inline. El PDF se sube desde el modal de edición (necesita el UUID).
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
  const [activeId, setActiveId] = useState(null);

  const activas = useMemo(() => revistas.filter((r) => r.activa), [revistas]);
  // Si no hay activeId, la activa por defecto es la primera (más reciente).
  // Si la activeId apunta a una edición que se desactivó, fallback a la 0.
  const current = useMemo(() => {
    if (activas.length === 0) return null;
    if (activeId == null) return activas[0];
    return activas.find((r) => r.id === activeId) || activas[0];
  }, [activas, activeId]);
  const count = activas.length;
  const stageDataCount = count >= 6 ? '6+' : String(count);

  const handleSelect = (id) => {
    if (id === current?.id) return;
    setActiveId(id);
  };

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
      ) : count === 0 ? (
        <div className="revistas-stage revistas-stage--empty">
          <p className="revistas-empty">
            {hydrated
              ? 'No hay revistas disponibles todavía.'
              : ''}
          </p>
        </div>
      ) : (
        <div className="revistas-stage" data-count={stageDataCount}>
          {activas.map((r) => {
            const isActive = current && r.id === current.id;
            return (
              <div
                key={r.id}
                className={`revista-slot ${isActive ? 'revista-slot--active' : 'revista-slot--thumb'}`}
                data-id={r.id}
              >
                {isActive ? (
                  <>
                    <div className="revista-platform" aria-hidden="true" />
                    <Revista3D portadaPath={r.portada_path} />
                    <div className="revista-active-meta">
                      <h2 className="revista-active-titulo">
                        {r.titulo || `Edición #${r.numero_edicion}`}
                      </h2>
                      {r.descripcion && (
                        <p className="revista-active-desc">{r.descripcion}</p>
                      )}
                      <button
                        type="button"
                        className="revista-add-btn revista-add-btn--3d"
                        onClick={() => handleAdd(r.id)}
                        disabled={hasInCart(r.id)}
                      >
                        {hasInCart(r.id)
                          ? 'En el carrito'
                          : `Agregar — $${r.precio}`}
                      </button>
                      {addError && (
                        <p className="cart-warning">{addError}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="revista-thumb"
                    onClick={() => handleSelect(r.id)}
                    aria-label={`Ver ${r.titulo || `edición #${r.numero_edicion}`}`}
                  >
                    <img
                      src={r.portada_path || '/Revistas/7.png'}
                      alt={r.titulo || `Edición #${r.numero_edicion}`}
                      loading="lazy"
                      draggable={false}
                    />
                    <span className="revista-thumb-titulo">
                      {r.titulo || `#${r.numero_edicion}`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
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
