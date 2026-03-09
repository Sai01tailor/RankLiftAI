/**
 * AppShell.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The main application shell for authenticated student routes.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Sidebar (fixed 256px, dark bg)              │
 *   │  ┌──────────────────────────────────────── ─┐│
 *   │  │ Topbar (sticky 60px)                      ││
 *   │  │ ─────────────────────────────────────     ││
 *   │  │ <Outlet /> (page content)                 ││
 *   │  └───────────────────────────────────────────┘│
 *   └─────────────────────────────────────────────┘
 *
 * On mobile (<1024px):
 *   - Sidebar is hidden off-screen, revealed by hamburger toggle
 *   - Overlay backdrop closes the sidebar when tapped
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Topbar  from '../Topbar';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile UX)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell" style={{ background: 'var(--bg-subtle)' }}>

      {/* ── Sidebar ── */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Mobile backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content area ── */}
      <div className="app-main">
        {/* Sticky topbar with hamburger for mobile */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content – rendered by React Router's <Outlet /> */}
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
