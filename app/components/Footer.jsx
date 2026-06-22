'use client';

import { useState } from 'react';
import Link from 'next/link';
import { footer, navLinks } from '../data/data';
import { useEditMode } from '../context/EditModeProvider';
import { useSiteSettings } from '../context/SiteSettingsProvider';
import EditableText from './EditableText';

/**
 * COMPONENTE FOOTER
 *
 * Cuatro bloques: marca, navegación rápida, redes, contacto.
 *
 * Los textos hardcodeados (brand, tagline) vienen de data.js. Los datos
 * editables (email, redes sociales) vienen de site_settings vía
 * SiteSettingsProvider. En edit mode aparecen botones inline para
 * editarlos.
 */
function Footer() {
  const year = new Date().getFullYear();
  const { editMode } = useEditMode();
  const { settings, updateSetting } = useSiteSettings();
  const [editing, setEditing] = useState(null); // key actualmente en edición
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (key) => {
    setEditing(key);
    setDraft(settings[key] || '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await updateSetting(editing, draft);
    setSaving(false);
    if (error) {
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    setEditing(null);
  };

  const renderEditableLink = (key, label, isMailto) => {
    const value = settings[key] || '';
    const href = isMailto && value ? `mailto:${value}` : value;
    if (editing === key) {
      return (
        <span className="footer-edit-row">
          <input
            type={isMailto ? 'email' : 'url'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            autoFocus
            className="footer-edit-input"
            placeholder={isMailto ? 'tu@email.com' : 'https://...'}
          />
          <button type="button" onClick={saveEdit} disabled={saving}>
            {saving ? '…' : '✓'}
          </button>
          <button type="button" onClick={() => setEditing(null)}>
            ✕
          </button>
        </span>
      );
    }
    return (
      <span className="footer-edit-row">
        {value ? (
          <a
            href={href}
            target={isMailto ? undefined : '_blank'}
            rel={isMailto ? undefined : 'noopener noreferrer'}
          >
            {label}
          </a>
        ) : (
          <span className="footer-empty">{label} (no configurado)</span>
        )}
        {editMode && (
          <button
            type="button"
            className="footer-edit-btn"
            onClick={() => startEdit(key)}
            aria-label={`Editar ${label}`}
          >
            ✎
          </button>
        )}
      </span>
    );
  };

  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <EditableText
            settingKey="footer_brand"
            fallback={footer.brand}
            as="p"
            className="footer-brand-name"
            maxLength={60}
          />
          <EditableText
            settingKey="footer_tagline"
            fallback={footer.tagline}
            as="p"
            className="footer-brand-tagline"
            maxLength={200}
            multiline
          />
        </div>

        <div className="footer-col">
          <h3 className="footer-col-title">Navegación</h3>
          <ul className="footer-list">
            {navLinks.map((link, index) => (
              <li key={index}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            {editMode && (
              <li>
                <Link href="/admin/editores">Invitar editores</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-col">
          <h3 className="footer-col-title">Seguinos</h3>
          <ul className="footer-list">
            <li>{renderEditableLink('instagram_url', 'Instagram', false)}</li>
            <li>{renderEditableLink('youtube_url', 'YouTube', false)}</li>
            <li>{renderEditableLink('whatsapp_url', 'WhatsApp', false)}</li>
            <li>{renderEditableLink('twitter_url', 'Twitter', false)}</li>
          </ul>
        </div>

        <div className="footer-col">
          <h3 className="footer-col-title">Contacto</h3>
          <ul className="footer-list">
            <li>{renderEditableLink('contact_email', settings.contact_email || 'Email', true)}</li>
            <li className="footer-list-note">
              <EditableText
                settingKey="footer_colaboraciones"
                fallback={footer.contacto.colaboraciones}
                as="span"
                maxLength={200}
                multiline
              />
            </li>
          </ul>
        </div>
      </div>

      <p className="footer-copyright">
        © {year} {footer.copyright}
      </p>
    </footer>
  );
}

export default Footer;
