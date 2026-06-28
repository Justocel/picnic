'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/app/context/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * Dashboard de analytics — solo editores.
 *
 * Las queries van directo a `analytics_events` con la publishable key. La
 * policy `analytics_select` permite SELECT solo si is_editor() → si entrás
 * sin ser editor, los datos vienen vacíos. Igual hacemos un guard del lado
 * del cliente para redirigir, así no se ve UI rota.
 */
function formatNumber(n) {
  return new Intl.NumberFormat('es-AR').format(n);
}

function AnalyticsContent() {
  const router = useRouter();
  const { isEditor, hydrated: authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!authReady) return;
    if (!isEditor) {
      router.replace('/');
      return;
    }
    load();
  }, [authReady, isEditor, days]);

  const load = async () => {
    setLoading(true);
    setError('');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [eventsRes, purchasesRes, usersRes] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('event_type, path, created_at, metadata, user_id, session_id')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('purchases')
        .select('id, precio_pagado, created_at')
        .gte('created_at', since),
      supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', since),
    ]);

    if (eventsRes.error) {
      setError('Error cargando eventos: ' + eventsRes.error.message);
      setLoading(false);
      return;
    }

    const events = eventsRes.data || [];
    const purchases = purchasesRes.data || [];
    const newUsers = usersRes.data || [];

    // Aggregations
    const byType = events.reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {});

    const pageviewsByPath = events
      .filter((e) => e.event_type === 'page_view')
      .reduce((acc, e) => {
        const p = e.path || '/';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {});

    const topPaths = Object.entries(pageviewsByPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const totalRevenue = purchases.reduce(
      (s, p) => s + Number(p.precio_pagado || 0),
      0
    );

    const uniqueSessions = new Set(
      events.map((e) => e.session_id).filter(Boolean)
    ).size;

    // Pageviews por día
    const byDay = {};
    events
      .filter((e) => e.event_type === 'page_view')
      .forEach((e) => {
        const day = e.created_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      });
    const sortedDays = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
    const maxDay = Math.max(1, ...Object.values(byDay));

    setData({
      byType,
      topPaths,
      totalEvents: events.length,
      totalPurchases: purchases.length,
      totalRevenue,
      newUsers: newUsers.length,
      uniqueSessions,
      pageviewsByDay: sortedDays,
      maxDay,
    });
    setLoading(false);
  };

  if (!authReady) return <main className="admin-page" />;
  if (!isEditor) return null;

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>Analytics</h1>
        <div className="admin-controls">
          <label>
            <span>Últimos</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </label>
          <button
            type="button"
            onClick={load}
            className="image-upload-btn"
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {data && (
        <>
          <section className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-label">Eventos totales</span>
              <span className="admin-stat-value">
                {formatNumber(data.totalEvents)}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Sesiones únicas</span>
              <span className="admin-stat-value">
                {formatNumber(data.uniqueSessions)}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Compras</span>
              <span className="admin-stat-value">
                {formatNumber(data.totalPurchases)}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Ingresos</span>
              <span className="admin-stat-value">
                ${formatNumber(data.totalRevenue)}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Usuarios nuevos</span>
              <span className="admin-stat-value">
                {formatNumber(data.newUsers)}
              </span>
            </div>
          </section>

          <section className="admin-section">
            <h2>Eventos por tipo</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td>{formatNumber(count)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="admin-section">
            <h2>Top páginas (page_view)</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topPaths.map(([path, count]) => (
                  <tr key={path}>
                    <td>
                      <code>{path}</code>
                    </td>
                    <td>{formatNumber(count)}</td>
                  </tr>
                ))}
                {data.topPaths.length === 0 && (
                  <tr>
                    <td colSpan={2}>Sin datos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="admin-section">
            <h2>Page views por día</h2>
            <div className="admin-bars">
              {data.pageviewsByDay.length === 0 ? (
                <p>Sin datos.</p>
              ) : (
                data.pageviewsByDay.map(([day, count]) => (
                  <div key={day} className="admin-bar-row">
                    <span className="admin-bar-day">{day}</span>
                    <div className="admin-bar-track">
                      <div
                        className="admin-bar-fill"
                        style={{
                          width: `${(count / data.maxDay) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="admin-bar-count">{count}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      <p className="admin-footer">
        <Link href="/">← Volver al sitio</Link>
      </p>
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <Header />
      <AnalyticsContent />
      <Footer />
    </>
  );
}
