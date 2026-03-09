/**
 * PublicLayout.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared layout for all public-facing pages (Landing, About, Contact, Terms).
 * Renders the public Navbar on top and a Footer at the bottom.
 * The <Outlet /> fills in the page-specific content.
 */
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../PublicNavbar';
import Footer from '../Footer';

export default function PublicLayout() {
  return (
    <div
      style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <PublicNavbar />
      {/* Main content grows to push footer to bottom */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
