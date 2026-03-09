/**
 * App.jsx – Root Router
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines every route in the application and renders the correct layout wrapper.
 *
 * Route categories:
 *  1. Public routes     – Accessible without auth (Landing, About, Contact, etc.)
 *  2. Auth routes       – Login / Register pages (redirect to /dashboard if already logged in)
 *  3. Protected routes  – Require authentication; render inside AppShell (sidebar + topbar)
 *  4. Admin routes      – Require role === 'admin'; wrapped in AdminLayout
 *  5. Full-screen routes– CBT mock test renders independently (no sidebar/topbar)
 *
 * Lazy loading is applied to all non-critical pages to improve initial bundle size.
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

/* ── Layout wrappers ── */
import PublicLayout   from './components/layout/PublicLayout';
import AppShell       from './components/layout/AppShell';
import AdminLayout    from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute     from './components/AdminRoute';

/* ── Eagerly loaded (critical path) ── */
import Landing    from './pages/public/Landing';
import Login      from './pages/auth/Login';
import Register   from './pages/auth/Register';

/* ── Lazy-loaded pages ── */
// Public / Info
const About     = lazy(() => import('./pages/public/About'));
const Contact   = lazy(() => import('./pages/public/Contact'));
const Terms     = lazy(() => import('./pages/public/Terms'));

// Student Portal
const Dashboard     = lazy(() => import('./pages/student/Dashboard'));
const Profile       = lazy(() => import('./pages/student/Profile'));
const Settings      = lazy(() => import('./pages/student/Settings'));
const Subscription  = lazy(() => import('./pages/student/Subscription'));

// Practice Hub
const ProblemSet     = lazy(() => import('./pages/practice/ProblemSet'));
const ProblemPage    = lazy(() => import('./pages/practice/ProblemPage'));
const Bookmarks      = lazy(() => import('./pages/practice/Bookmarks'));
const Leaderboard    = lazy(() => import('./pages/practice/Leaderboard'));

// Testing Engine
const MockTestList   = lazy(() => import('./pages/test/MockTestList'));
const MockTestEngine = lazy(() => import('./pages/test/MockTestEngine'));
const TestAnalysis   = lazy(() => import('./pages/test/TestAnalysis'));
const TestHistory    = lazy(() => import('./pages/test/TestHistory'));
const TestPDF        = lazy(() => import('./pages/test/TestPDF'));

// Admin Panel
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCurriculum   = lazy(() => import('./pages/admin/AdminCurriculum'));
const AdminQuestions    = lazy(() => import('./pages/admin/AdminQuestions'));
const AdminMockTests    = lazy(() => import('./pages/admin/AdminTests'));
const AdminUsers        = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSubscriptions= lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminDesign       = lazy(() => import('./pages/admin/AdminDesign'));

/* ── Generic page-level loading spinner ── */
function PageLoader() {
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

export default function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ══════════════════════════════════════════════════════════
            PUBLIC ROUTES — no auth required
            ══════════════════════════════════════════════════════════ */}
        <Route element={<PublicLayout />}>
          <Route index path="/"        element={<Landing />} />
          <Route path="/about"         element={<About />} />
          <Route path="/contact"       element={<Contact />} />
          <Route path="/terms"         element={<Terms />} />
        </Route>

        {/* ══════════════════════════════════════════════════════════
            AUTH ROUTES — redirect to /dashboard if already logged in
            ══════════════════════════════════════════════════════════ */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        {/* ══════════════════════════════════════════════════════════
            FULL-SCREEN — NTA CBT interface (no sidebar/topbar)
            ══════════════════════════════════════════════════════════ */}
        <Route
          path="/test/:testId/attempt"
          element={
            <ProtectedRoute>
              <MockTestEngine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test/:testId/pdf"
          element={
            <ProtectedRoute>
              <TestPDF />
            </ProtectedRoute>
          }
        />

        {/* ══════════════════════════════════════════════════════════
            PROTECTED STUDENT ROUTES — rendered inside AppShell
            ══════════════════════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/profile"      element={<Profile />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/subscription" element={<Subscription />} />

          {/* Practice Hub */}
          <Route path="/problems"          element={<ProblemSet />} />
          <Route path="/problems/:id"      element={<ProblemPage />} />
          <Route path="/bookmarks"         element={<Bookmarks />} />
          <Route path="/leaderboard"       element={<Leaderboard />} />

          {/* Testing Engine */}
          <Route path="/tests"            element={<MockTestList />} />
          <Route path="/test-history"     element={<TestHistory />} />
          <Route path="/test/:testId/analysis/:attemptId"  element={<TestAnalysis />} />
        </Route>

        {/* ══════════════════════════════════════════════════════════
            ADMIN ROUTES — rendered inside AdminLayout
            ══════════════════════════════════════════════════════════ */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index           element={<AdminDashboard />} />
          <Route path="curriculum"   element={<AdminCurriculum />} />
          <Route path="questions"    element={<AdminQuestions />} />
          <Route path="mock-tests"   element={<AdminMockTests />} />
          <Route path="users"        element={<AdminUsers />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="design"       element={<AdminDesign />} />
        </Route>

        {/* ══════════════════════════════════════════════════════════
            CATCH-ALL — redirect to home
            ══════════════════════════════════════════════════════════ */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Suspense>
  );
}
