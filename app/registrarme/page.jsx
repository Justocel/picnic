'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthProvider';
import { trackEvent } from '@/lib/analytics';
import { safeNextPath, isValidEmail } from '../utils/utils';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const next = safeNextPath(searchParams.get('next'));
  // Token de invitación de editor (viene de /registrarme?invite=xxxx).
  // El registro pasa este token a Supabase como user metadata; el trigger
  // handle_new_user lo valida y promueve el profile a 'editor' si es válido.
  const inviteToken = (searchParams.get('invite') || '').trim() || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = nombre.trim();
    if (!cleanEmail || !password) {
      setError('Completá email y contraseña');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('El email no tiene un formato válido');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await register(cleanEmail, password, cleanNombre, inviteToken);
      trackEvent('signup', { userId: data?.user?.id || null });
      if (!data.session) {
        setInfo(
          'Te mandamos un mail para confirmar tu cuenta. Revisalo y volvé a iniciar sesión.'
        );
        setLoading(false);
        return;
      }
      router.push(next);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        setError('Ese email ya tiene una cuenta. Iniciá sesión.');
      } else if (msg.includes('password')) {
        setError('Esa contraseña no es válida. Probá una más larga.');
      } else {
        setError('No pudimos crear la cuenta. Probá de nuevo en un momento.');
      }
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p className="auth-sub">
          Registrate para guardar tus compras y bajar las revistas cuando
          quieras.
        </p>
        {inviteToken && (
          <p className="auth-info">
            Estás creando una cuenta de editor con un link de invitación.
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              maxLength={80}
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label className="auth-field">
            <span>Contraseña (mínimo 8 caracteres)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={200}
              minLength={8}
              required
            />
          </label>
          <label className="auth-field">
            <span>Repetir contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={200}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-alt">
          ¿Ya tenés cuenta?{' '}
          <Link href={`/login${next ? `?next=${next}` : ''}`}>
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
      <Footer />
    </>
  );
}
