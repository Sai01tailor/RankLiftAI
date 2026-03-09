/**
 * Sidebar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Application sidebar for authenticated student portal.
 *
 * Features:
 *  • Fixed 256px on desktop, slides in/out on mobile
 *  • Dark background (matches NTA/Unacademy design aesthetic)
 *  • Grouped navigation: Main, Practice, Testing, Account
 *  • User avatar + subscription badge at the bottom
 *  • Daily streak display
 */

import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, User, Settings, CreditCard,
  BookOpen, Trophy, FlaskConical, ClipboardList,
  BarChart2, Flame, X, ShieldCheck, Bookmark, History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── Navigation structure ── */
const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/problems',    icon: BookOpen,      label: 'Problem Set' },
      { to: '/bookmarks',   icon: Bookmark,      label: 'Revise Later' },
      { to: '/leaderboard', icon: Trophy,        label: 'Leaderboard' },
    ],
  },
  {
    label: 'Testing',
    items: [
      { to: '/tests', icon: ClipboardList, label: 'Mock Tests' },
      { to: '/test-history', icon: History, label: 'Test History' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile',      icon: User,       label: 'Profile' },
      { to: '/settings',     icon: Settings,   label: 'Settings' },
      { to: '/subscription', icon: CreditCard, label: 'Subscription' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  return (
    <aside
      className={`app-sidebar ${isOpen ? 'open' : ''}`}
      aria-label="Application sidebar"
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center justify-between px-5 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-base"
            style={{ background: 'var(--gradient-brand)' }}
          >J</div>
          <span className="font-bold text-white text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            JeeWallah
          </span>
        </Link>
        {/* Close button – mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ color: 'var(--text-sidebar)', background: 'rgba(255,255,255,0.06)' }}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Navigation groups ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="px-3 mb-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                     ${isActive ? 'text-white' : 'hover:text-white'}`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? '#ffffff' : 'var(--text-sidebar)',
                    background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                  })}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Admin link – only visible to admins */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-1.5 text-xs font-bold uppercase tracking-widest"
               style={{ color: 'rgba(255,255,255,0.25)' }}>Admin</p>
            <NavLink
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: '#f97316' }}
            >
              <ShieldCheck size={16} /> Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      {/* ── User info (bottom) ── */}
      <div
        className="p-4 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Streak badge — streak is an object {currentStreak, longestStreak, lastActiveDate} */}
        {(() => {
          const streakCount = typeof user?.streak === 'object'
            ? (user?.streak?.currentStreak ?? 0)
            : (user?.streak ?? 0);
          return streakCount > 0 ? (
            <div className="streak-badge mb-3 text-xs">
              <Flame size={13} /> {streakCount}-day streak 🔥
            </div>
          ) : null;
        })()}

        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
            style={{ background: 'var(--gradient-brand)' }}
          >
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.username || 'Student'}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
