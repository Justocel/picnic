'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthProvider';
import { trackEvent } from '@/lib/analytics';
import { safeNextPath, isValidEmail } from '../utils/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const next = safeNextPath(searchParams.get('next'));
  const justConfirmed = searchParams.get('confirmed') === 'true';

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Completá email y contraseña');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('El email no tiene un formato válido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await login(cleanEmail, password);
      trackEvent('login', { userId: data?.user?.id || null });
      router.push(next);
    } catch (err) {
      // Mensaje genérico para no revelar si el email existe (enumeration attack).
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('confirm')) {
        setError('Tenés que confirmar el email antes de entrar. Revisá tu inbox.');
      } else {
        setError('No pudimos iniciar sesión. Probá de nuevo en un momento.');
      }
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Iniciar sesión</h1>
        <p className="auth-sub">
          Ingresá con tu email para acceder a las revistas que ya compraste.
        </p>
        {justConfirmed && (
          <p className="auth-info">
            Listo, tu cuenta fue confirmada. Iniciá sesión para continuar.
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
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
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="auth-alt">
          ¿No tenés cuenta?{' '}
          <Link href={`/registrarme${next ? `?next=${next}` : ''}`}>
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
