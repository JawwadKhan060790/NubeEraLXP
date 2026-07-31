/**
 * App.tsx - Root Application Component
 *
 * Responsibilities (and ONLY these):
 *  1. Wrap the application in providers (theme, auth, toaster).
 *  2. Set up the router.
 *  3. Route between the public login page and the authenticated shell.
 *
 * All auth state management is in AuthContext.
 * All route definitions are in app/routes/index.tsx.
 * All providers are composed in app/providers/AppProviders.tsx.
 * All layout state (sidebar width, collapse) lives in AuthenticatedLayout.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProviders }              from './app/providers/AppProviders';
import { useAuthContext }            from './context/AuthContext';
import { useTheme }                  from './contexts/ThemeContext';
import { AuthenticatedRoutes }       from './app/routes/index';
import { ROUTES }                    from './constants/routes';
import { SchoolSelectorProvider }    from './contexts/SchoolSelectorContext';
import Sidebar     from './layout/Sidebar';
import Header      from './layout/Header';
import ChatButton  from './components/AIChat/ChatButton';

import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

// Login page - not lazy because it's the first thing unauthenticated users see.
import Login from './modules/auth/pages/Login';

// ── Root ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <AppProviders>
    <GlobalErrorBoundary>
      <Router>
        <AppRoutes />
      </Router>
    </GlobalErrorBoundary>
  </AppProviders>
);

// ── Route shell: decides login page vs. authenticated layout ──────────────────

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthContext();

  // Show nothing until the auth check completes to avoid a flash of the login page.
  if (isLoading) return null;

  const defaultDash =
    user?.utype === 'admin' || user?.utype === 'superadmin' ? ROUTES.ADMIN_DASHBOARD :
    user?.utype === 'principal'  ? ROUTES.PRINCIPAL_DASHBOARD :
    user?.utype === 'staff'      ? ROUTES.STAFF_DASHBOARD :
    user?.utype === 'teacher'    ? ROUTES.TEACHER_DASHBOARD :
    user?.utype === 'parent'     ? ROUTES.PARENT_DASHBOARD :
    ROUTES.STUDENT_LEARNING;

  return (
    <Routes>
      {/* Public: redirect to dashboard if already logged in */}
      <Route
        path={ROUTES.LOGIN}
        element={isAuthenticated ? <Navigate to={defaultDash} replace /> : <Login />}
      />

      {/* Authenticated shell */}
      <Route
        path="/*"
        element={
          isAuthenticated
            ? <AuthenticatedLayout userUtype={user?.utype ?? 'student'} />
            : <Navigate to={ROUTES.LOGIN} replace />
        }
      />
    </Routes>
  );
};

// ── Authenticated shell: sidebar + header + main content ─────────────────────

const AuthenticatedLayout: React.FC<{ userUtype: string }> = ({ userUtype }) => {
  const { user }            = useAuthContext();
  const { setTheme }        = useTheme();
  const location            = useLocation();
  const [sidebarOpen, setSidebarOpen]     = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed]     = useState(false);
  const [sidebarWidth, setSidebarWidth]   = useState(288);

  // Principal theme override
  useEffect(() => {
    if (userUtype === 'principal') setTheme('light');
  }, [userUtype, setTheme]);

  // Responsive sidebar auto-open/close
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveWidth = isCollapsed ? 80 : sidebarWidth;

  return (
    <SchoolSelectorProvider userUtype={userUtype}>
      <div className="min-h-screen overflow-x-hidden">
        <Sidebar
          role={user?.utype || 'student'}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          width={effectiveWidth}
          onWidthChange={setSidebarWidth}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        <div
          className="min-h-screen flex flex-col transition-all duration-500"
          style={{ paddingLeft: window.innerWidth >= 1024 ? `${effectiveWidth}px` : undefined }}
        >
          <Header user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarWidth={effectiveWidth} />

          <main className="flex-1 min-w-0 p-4 md:p-6 mt-[60px]">
            {/*
              Suspense must wrap <Routes>, not be inside it.
              AuthenticatedRoutes is called as a FUNCTION (not <Component/>) because
              React Router v7 requires that all direct <Routes> children are <Route>
              or <React.Fragment>. A custom component wrapper fails the validator.
            */}
            <Suspense fallback={null}>
              <Routes>
                {AuthenticatedRoutes({ userUtype })}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        {/* Floating AI chat button - visible on all authenticated pages */}
        <ChatButton />
      </div>
    </SchoolSelectorProvider>
  );
};

export default App;
