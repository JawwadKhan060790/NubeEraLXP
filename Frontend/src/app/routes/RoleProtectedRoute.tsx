/**
 * RoleProtectedRoute
 *
 * A route guard that redirects to /login when the user is not authenticated
 * and to /unauthorized when the user lacks the required role.
 *
 * Usage:
 *   <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
 *     <MyPage />
 *   </RoleProtectedRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import type { RoleValue } from '../../constants/roles';

interface RoleProtectedRouteProps {
  allowedRoles: RoleValue[];
  children: React.ReactElement;
}

class LocalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("LocalErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorString = String(this.state.error?.message || this.state.error);
      const isFailedFetch =
        errorString.includes('Failed to fetch dynamically imported module') ||
        errorString.includes('Importing a module script failed') ||
        errorString.includes('error loading dynamically imported module') ||
        errorString.includes('ChunkLoadError');

      if (isFailedFetch) {
        throw this.state.error;
      }

      return (
        <div style={{ padding: '20px', background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '8px', margin: '20px', color: '#9f1239' }} id="local-error-boundary-screen">
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Something went wrong.</h2>
          <p style={{ fontWeight: 'bold', fontFamily: 'monospace', margin: 0 }}>{this.state.error?.message}</p>
          <pre style={{ marginTop: '10px', fontSize: '12px', background: '#ffe4e6', padding: '10px', overflowX: 'auto', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
            {"\n\nComponent Stack:\n"}
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  try {
    const { user, isAuthenticated } = useAuthContext();

    if (!isAuthenticated) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const userRole = (user?.utype || '').toLowerCase() as RoleValue;
    if (!allowedRoles || !Array.isArray(allowedRoles)) {
      console.error('RoleProtectedRoute: allowedRoles is not an array:', allowedRoles);
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }
    const hasRole  = allowedRoles.map((r) => r?.toLowerCase()).includes(userRole);

    if (!hasRole) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }

    return <LocalErrorBoundary>{children}</LocalErrorBoundary>;
  } catch (err) {
    console.error('CRITICAL ERROR IN RoleProtectedRoute:', err);
    throw err;
  }
};
