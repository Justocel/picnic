'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * Página /admin/editores
 *
 * Solo editores. Permite generar tokens de invitación con expiración (7 días
 * por default, set en la DB). Cada token se convierte en un link tipo:
 *   https://<site>/registrarme?invite=<token>
 *
 * Quien complete el registro con ese link queda con role='editor'. El token
 * se quema al usarse (el trigger handle_new_user lo marca como used).
 */
export default function AdminEditoresPage() {
  const router = useRouter();
  const { user, isEditor, hydrated } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  // Redirect si no es editor.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login?next=/admin/editores');
      return;
    }
    if (!isEditor) {
      router.replace('/');
    }
  }, [hydrated, user, isEditor, router]);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('editor_invitations')
      .select('token, notas, expires_at, used_at, used_by, created_at')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setInvitations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isEditor) load();
  }, [isEditor]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError('');
    const { error: err } = await supabase
      .from('editor_invitations')
      .insert({ created_by: user.id, notas: notas.trim() || null });
    if (err) {
      setError(err.message);
    } else {
      setNotas('');
      await load();
    }
    setGenerating(false);
  };

  const handleRevoke = async (token) => {
    if (!confirm('¿Revocar este link? El que lo tenga no va a poder usarlo.')) return;
    const { error: err } = await supabase
      .from('editor_invitations')
      .delete()
      .eq('token', token);
    if (err) {
      alert(err.message);
    } else {
      await load();
    }
  };

  const buildInviteUrl = (token) => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    return `${base}/registrarme?invite=${token}`;
  };

  if (!hydrated || !isEditor) {
    return (
      <>
        <Header />
        <main className="admin-page" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="admin-page">
        <div className="admin-header">
          <h1>Invitaciones de editores</h1>
          <p className="admin-sub">
            Generá un link único. Compartilo en privado al editor que quieras
            sumar. El link se quema cuando se registra y vence a los 7 días.
          </p>
        </div>

        <div className="admin-card">
          <h2>Nuevo link</h2>
          <label className="auth-field">
            <span>Notas (opcional, ej. "Para Sofía")</span>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={120}
              placeholder="Para quién es"
            />
          </label>
          <button
            type="button"
            className="auth-submit"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generando…' : 'Generar link'}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </div>

        <div className="admin-card">
          <h2>Links activos</h2>
          {loading ? (
            <p className="seccion-descripcion">Cargando…</p>
          ) : invitations.length === 0 ? (
            <p className="seccion-descripcion">Todavía no hay links.</p>
          ) : (
            <ul className="invite-list">
              {invitations.map((inv) => {
                const url = buildInviteUrl(inv.token);
                const isUsed = !!inv.used_at;
                const isExpired = new Date(inv.expires_at) < new Date();
                const status = isUsed
                  ? 'Usado'
                  : isExpired
                    ? 'Vencido'
                    : 'Activo';
                return (
                  <li
                    key={inv.token}
                    className={`invite-item invite-item--${status.toLowerCase()}`}
                  >
                    <div className="invite-meta">
                      <strong>{status}</strong>
                      {inv.notas && <span> · {inv.notas}</span>}
                      <span className="invite-date">
                        {' '}· vence {new Date(inv.expires_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    {!isUsed && !isExpired && (
                      <div className="invite-actions">
                        <input
                          type="text"
                          value={url}
                          readOnly
                          className="invite-url"
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          className="invite-copy"
                          onClick={() => navigator.clipboard?.writeText(url)}
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          className="invite-revoke"
                          onClick={() => handleRevoke(inv.token)}
                        >
                          Revocar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
