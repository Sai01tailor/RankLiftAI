/**
 * PublicNavbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Navigation bar for all public-facing pages.
 * Features:
 *  • Transparent on hero then turns solid on scroll (backdrop-blur)
 *  • Mobile hamburger menu with full-screen nav overlay
 *  • Dark mode toggle button
 *  • CTA "Start Free" button
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Moon, Sun, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

const NAV_LINKS = [
  { to: '/about',   label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/terms',   label: 'Terms' },
];

export default function PublicNavbar() {
  const { settings } = useSite();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Show solid background after 60px of scroll ── */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? isDark
              ? 'rgba(10,13,20,0.95)'
              : 'rgba(255,255,255,0.95)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2.5" aria-label="JeeWallah Home">
              {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-base"
                    style={{ background: 'var(--gradient-brand)' }}
                  >{settings.siteName.charAt(0).toUpperCase()}</div>
              )}
              <span
                className="font-bold text-lg"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  color: scrolled || isDark || !isHome ? 'var(--text-heading)' : '#ffffff',
                }}
              >{settings.siteName}</span>
            </Link>

            {/* ── Desktop nav links ── */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className="nav-link-animated text-sm font-medium transition-colors"
                  style={({ isActive }) => ({
                    color: isActive
                      ? 'var(--accent-primary)'
                      : scrolled || isDark || !isHome
                        ? 'var(--text-secondary)'
                        : 'rgba(255,255,255,0.8)',
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </div>

            {/* ── Right CTAs ── */}
            <div className="flex items-center gap-3">

              {/* Auth buttons */}
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-sm">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:inline-flex btn btn-ghost btn-sm"
                    style={{
                      color: scrolled || isDark || !isHome ? 'var(--text-secondary)' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm gap-1.5">
                    <Zap size={13} /> Start Free
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{
                  color: scrolled || isDark || !isHome ? 'var(--text-secondary)' : 'rgba(255,255,255,0.8)',
                  background: scrolled || isDark || !isHome ? 'var(--bg-subtle)' : 'rgba(255,255,255,0.1)',
                }}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[100] md:hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b"
               style={{ borderColor: 'var(--border-subtle)' }}>
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-base"
                       style={{ background: 'var(--gradient-brand)' }}>{settings.siteName.charAt(0).toUpperCase()}</div>
              )}
              <span className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
                {settings.siteName}
              </span>
            </Link>
            <button onClick={() => setMobileOpen(false)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl font-medium text-base transition-all"
                style={{ color: 'var(--text-primary)' }}
              >
                {label}
              </Link>
            ))}
            <hr style={{ borderColor: 'var(--border-subtle)', margin: '1rem 0' }} />
            <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl font-medium text-base"
                  style={{ color: 'var(--text-secondary)' }}>Login</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}
                  className="btn btn-primary w-full mt-2">
              <Zap size={14} /> Start Free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
