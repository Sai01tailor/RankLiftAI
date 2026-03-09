/**
 * AdminLayout.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout wrapper for all admin panel routes.
 * Renders a separate dark admin sidebar and an Outlet for page content.
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileQuestion, BookOpen, Folder,
  Users, CreditCard, LogOut, Menu, X, ChevronRight, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin',             icon: LayoutDashboard, label: 'Dashboard',     exact: true },
  { to: '/admin/curriculum',  icon: Folder,          label: 'Curriculum' },
  { to: '/admin/questions',   icon: FileQuestion,    label: 'Questions' },
  { to: '/admin/mock-tests',  icon: BookOpen,        label: 'Mock Tests' },
  { to: '/admin/users',       icon: Users,           label: 'Users' },
  { to: '/admin/subscriptions',icon: CreditCard,     label: 'Subscriptions' },
  { to: '/admin/design',      icon: Settings,        label: 'Design Settings' },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-subtle)' }}>

      {/* ── Admin Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: '#0b0f1a', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
               style={{ background: 'var(--gradient-brand)' }}>J</div>
          <div>
            <p className="font-bold text-white text-sm">JeeWallah</p>
            <p style={{ color: '#f97316', fontSize: '0.7rem', fontWeight: 600 }}>ADMIN PANEL</p>
          </div>
          <button className="lg:hidden ml-auto text-slate-400 hover:text-white"
                  onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
              })}
            >
              <Icon size={16} />
              {label}
              <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                 style={{ background: 'var(--gradient-brand)' }}>
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-white text-xs font-semibold truncate max-w-[120px]">{user?.username}</p>
              <p style={{ color: '#f97316', fontSize: '0.65rem' }}>Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-red-500/10 transition-all"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden bg-black/60"
             onClick={() => setOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 lg:pl-64">
        {/* Admin topbar */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-4"
                style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button className="lg:hidden" onClick={() => setOpen(true)}
                  style={{ color: 'var(--text-secondary)' }}>
            <Menu size={20} />
          </button>
          <p className="font-semibold text-sm hidden lg:block" style={{ color: 'var(--text-secondary)' }}>
            Admin Control Panel
          </p>
        </header>

        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
