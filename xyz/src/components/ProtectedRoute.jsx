/**
 * ProtectedRoute.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps any route that requires the user to be authenticated.
 *
 * Guards:
 *  1. While AuthContext is restoring session from localStorage (loading=true),
 *     show a spinner — prevents a flash-redirect to /login on hard refresh.
 *  2. Once loading is done, if no user → redirect to /login with `state.from`
 *     so we can navigate back after login.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Still restoring session from localStorage — don't redirect yet
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{ background: 'var(--bg-base)' }}>
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Carry the attempted URL so Login can redirect back after success
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
