/**
 * Topbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top bar within the authenticated AppShell.
 * Contains:
 *  • Hamburger menu (mobile only) to open the sidebar
 *  • Page title (auto-detected from route)
 *  • Dark mode toggle
 *  • Notification bell (placeholder)
 *  • User avatar with dropdown (profile, logout)
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Maps route prefixes to page titles ── */
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/profile':      'My Profile',
  '/settings':     'Settings',
  '/subscription': 'Subscription',
  '/problems':     'Problem Set',
  '/leaderboard':  'Leaderboard',
  '/tests':        'Mock Tests',
};

function getPageTitle(pathname) {
  const entry = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key));
  return entry ? entry[1] : 'JeeWallah';
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="app-topbar">
      {/* ── Left: hamburger + page title ── */}
      <div className="flex items-center gap-3">
        {/* Hamburger – only on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <h1
          className="font-bold text-base"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}
        >
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-all"
            style={{ background: dropdownOpen ? 'var(--bg-subtle)' : 'transparent' }}
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: 'var(--gradient-brand)' }}
            >
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate"
                  style={{ color: 'var(--text-primary)' }}>
              {user?.username}
            </span>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              {/* User info */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user?.username}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {user?.email}
                </p>
              </div>

              {/* Links */}
              <div className="py-1">
                {[
                  { icon: User,     label: 'Profile',  to: '/profile' },
                  { icon: Settings, label: 'Settings', to: '/settings' },
                ].map(({ icon: Icon, label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon size={14} /> {label}
                  </Link>
                ))}
              </div>

              {/* Logout */}
              <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--accent-danger)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
