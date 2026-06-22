'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks, secciones } from '../data/data';
import { useAuth } from '../context/AuthProvider';
import { useCart } from '../context/CartProvider';
import { useEditMode } from '../context/EditModeProvider';
import CartPanel from './CartPanel';

/**
 * COMPONENTE HEADER
 *
 * Desktop: nav sticky con todos los links inline.
 * Mobile (≤ 700px): hamburger button que abre un drawer lateral con todos
 * los links y acciones de usuario.
 */
function Header() {
  const { user, hydrated, isEditor, logout } = useAuth();
  const { totalItems, showCart, setShowCart } = useCart();
  const { editMode, toggleEditMode } = useEditMode();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [activeSection, setActiveSection] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Set de ids de sección que existen actualmente en el DOM. Empieza como
  // null para no filtrar nada en SSR (evita mismatch). Después del primer
  // efecto se popula con lo que esté montado.
  const [availableIds, setAvailableIds] = useState(null);

  useEffect(() => {
    const ids = navLinks
      .map((l) => l.href.split('#')[1])
      .filter(Boolean);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
      const triggerY = window.innerHeight * 0.3;
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= triggerY) current = id;
      }
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detectar qué secciones existen realmente en el DOM, así filtramos del
  // nav los links que apuntan a anchors inexistentes (ej. "Eventos próximos"
  // cuando no hay eventos cargados, "Artículos" si están vacíos, etc).
  // Chequeamos varias veces porque los providers cargan data async y las
  // secciones se montan/desmontan después del primer paint.
  // SOLO aplicamos esta lógica en la home: en otras páginas (/mis-ordenes,
  // /leer, /admin, etc) ninguno de esos anchors existe y se filtraría todo.
  useEffect(() => {
    if (!isHome) {
      setAvailableIds(null);
      return;
    }
    const ids = navLinks
      .map((l) => l.href.split('#')[1])
      .filter(Boolean);
    const update = () => {
      const present = new Set(ids.filter((id) => document.getElementById(id)));
      setAvailableIds((prev) => {
        if (prev && prev.size === present.size) {
          let same = true;
          for (const id of present) if (!prev.has(id)) { same = false; break; }
          if (same) return prev;
        }
        return present;
      });
    };
    update();
    const timers = [50, 250, 800, 2000].map((ms) => setTimeout(update, ms));
    return () => timers.forEach(clearTimeout);
  }, [isHome]);

  // En la home filtramos por anchors presentes (oculta secciones vacías).
  // Fuera de la home mostramos todos: los links apuntan a /#seccion y
  // navegan a la home antes de scrollear.
  const visibleNavLinks = isHome && availableIds
    ? navLinks.filter((l) => {
        const id = l.href.split('#')[1];
        return !id || availableIds.has(id);
      })
    : navLinks;

  // Cerrar drawer con ESC.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Cerrar drawer al navegar.
  const handleLinkClick = () => setMenuOpen(false);

  return (
    <>
      <header className="cuerpo">
        <Link href="/" className="cuerpo-link" aria-label="Ir al inicio">
          <h2>{secciones.hero.titulo}</h2>
          <h1>{secciones.hero.subtitulo}</h1>
        </Link>
      </header>

      <nav
        className={`subheader${isScrolled ? ' subheader--scrolled' : ''}`}
        aria-label="Navegación interna de secciones"
      >
        {/* Hamburger — solo aparece en mobile via CSS. */}
        <button
          type="button"
          className="subheader-burger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>

        <div className="subheader-links">
          {visibleNavLinks.map((link, index) => {
            const id = link.href.split('#')[1];
            const isActive = id === activeSection;
            return (
              <Link
                key={index}
                href={link.href}
                className={isActive ? 'subheader-link--active' : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="subheader-auth" aria-label="Cuenta de usuario">
          {/* El botón carrito solo se muestra si hay algo dentro — sino
              ocupa espacio sin propósito (sobre todo en mobile). */}
          {totalItems > 0 && (
            <button
              type="button"
              className="subheader-cart"
              onClick={() => setShowCart((prev) => !prev)}
              aria-label={`Carrito (${totalItems} ${
                totalItems === 1 ? 'item' : 'items'
              })`}
              aria-expanded={showCart}
            >
              Carrito
              <span className="subheader-cart-badge">{totalItems}</span>
            </button>
          )}
          {hydrated && user ? (
            <>
              {isEditor && (
                <>
                  <button
                    type="button"
                    className={`subheader-edit${editMode ? ' subheader-edit--active' : ''}`}
                    onClick={toggleEditMode}
                    aria-pressed={editMode}
                    title={editMode ? 'Salir del modo edición' : 'Activar modo edición'}
                  >
                    {editMode ? 'Salir de edición' : 'Editar'}
                  </button>
                  <Link
                    href="/admin/analytics"
                    className="subheader-edit"
                    title="Analytics"
                  >
                    Analytics
                  </Link>
                </>
              )}
              <Link
                href="/mis-revistas"
                className="subheader-user"
                title={user.email}
              >
                Mis revistas
              </Link>
              <button
                type="button"
                className="subheader-logout"
                onClick={logout}
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="subheader-login">
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile drawer + backdrop */}
      {menuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`mobile-drawer${menuOpen ? ' mobile-drawer--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-drawer-header">
          <span>Menú</span>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        <nav className="mobile-drawer-nav" aria-label="Navegación móvil">
          {visibleNavLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={handleLinkClick}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-drawer-auth">
          {hydrated && user ? (
            <>
              <Link href="/mis-revistas" onClick={handleLinkClick}>
                Mis revistas
              </Link>
              <Link href="/mis-ordenes" onClick={handleLinkClick}>
                Mis órdenes
              </Link>
              {isEditor && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      toggleEditMode();
                      setMenuOpen(false);
                    }}
                  >
                    {editMode ? 'Salir de edición' : 'Activar edición'}
                  </button>
                  <Link href="/admin/analytics" onClick={handleLinkClick}>
                    Analytics
                  </Link>
                  <Link href="/admin/editores" onClick={handleLinkClick}>
                    Invitar editores
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" onClick={handleLinkClick}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </aside>

      <CartPanel />
    </>
  );
}

export default Header;
