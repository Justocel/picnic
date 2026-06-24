'use client';

import { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';

/**
 * Modal para crear o editar un evento.
 * Props:
 *  - evento: objeto existente o null (crear)
 *  - onSave: (formData) => Promise<{ error }>
 *  - onClose: () => void
 */
export default function EventoEditModal({ evento, onSave, onClose }) {
  const isNew = !evento;
  const [form, setForm] = useState({
    nombre: evento?.nombre || '',
    fecha: evento?.fecha || '',
    image_path: evento?.image_path || '',
    descripcion: evento?.descripcion || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!form.fecha) {
      setError('La fecha es requerida');
      return;
    }
    setError('');
    setSaving(true);
    const { error: err } = await onSave({
      nombre: form.nombre.trim(),
      fecha: form.fecha,
      image_path: form.image_path.trim() || null,
      descripcion: form.descripcion.trim() || null,
    });
    if (err) {
      setError(err.message || 'Error al guardar');
      setSaving(false);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{isNew ? 'Nuevo evento' : 'Editar evento'}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="auth-field">
            <span>Nombre *</span>
            <input
              type="text"
              value={form.nombre}
              onChange={setField('nombre')}
              maxLength={120}
              required
            />
          </label>
          <label className="auth-field">
            <span>Fecha *</span>
            <input
              type="date"
              value={form.fecha}
              onChange={setField('fecha')}
              required
            />
          </label>
          <div className="auth-field">
            <span>Flyer / imagen</span>
            <ImageUpload
              value={form.image_path}
              onChange={(v) => setForm((f) => ({ ...f, image_path: v || '' }))}
              folder="eventos"
            />
          </div>
          <label className="auth-field">
            <span>Descripción</span>
            <textarea
              value={form.descripcion}
              onChange={setField('descripcion')}
              rows={4}
              maxLength={1000}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="modal-save">
              {saving ? 'Guardando…' : isNew ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
