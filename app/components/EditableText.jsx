'use client';

import { useState } from 'react';
import { useEditMode } from '../context/EditModeProvider';
import { useSiteSettings } from '../context/SiteSettingsProvider';

/**
 * EditableText — texto del sitio editable inline en modo edición.
 *
 * Props:
 *   - settingKey: key en site_settings (debe estar en la whitelist del provider).
 *   - fallback: texto default si la key no está seteada en DB.
 *   - as: tag HTML del contenido en modo lectura (default 'span').
 *   - multiline: textarea vs input al editar.
 *   - maxLength: límite del input/textarea.
 *   - className: clase CSS extra aplicada al tag del contenido.
 *
 * Estructura:
 *   - Modo lectura, sin edit: solo el <Tag>{value}</Tag> (sin wrapper extra).
 *   - Modo edit, no editando: <div class="editable-text"><Tag>...</Tag><button>✎</button></div>.
 *   - Modo edit, editando: <div class="editable-text editing">input + ✓/✕</div>.
 *
 * El wrapper en edit mode siempre es div para soportar tags block (p, h1, blockquote)
 * sin generar HTML inválido (span no puede contener block).
 */
export default function EditableText({
  settingKey,
  fallback = '',
  as: Tag = 'span',
  multiline = false,
  maxLength,
  className = '',
}) {
  const { editMode } = useEditMode();
  const { getText, updateSetting } = useSiteSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const value = getText(settingKey, fallback);

  // Modo lectura puro: renderizar solo el tag con el texto.
  if (!editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    const { error } = await updateSetting(settingKey, draft);
    setSaving(false);
    if (error) {
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="editable-text editable-text--editing">
        {multiline ? (
          <textarea
            className="editable-text-input"
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(3, Math.min(12, Math.ceil(draft.length / 80) + 1))}
            autoFocus
          />
        ) : (
          <input
            type="text"
            className="editable-text-input"
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        )}
        <div className="editable-text-actions">
          <button type="button" onClick={save} disabled={saving}>
            {saving ? '…' : '✓ Guardar'}
          </button>
          <button type="button" onClick={cancel} disabled={saving}>
            ✕ Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editable-text editable-text--readable">
      <Tag className={className}>{value}</Tag>
      <button
        type="button"
        className="editable-text-edit-btn"
        onClick={startEdit}
        aria-label="Editar texto"
        title="Editar texto"
      >
        ✎
      </button>
    </div>
  );
}
