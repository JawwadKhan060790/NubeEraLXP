/**
 * useAuth hook
 *
 * Thin re-export of useAuthContext for backward compatibility and convenience.
 * Components import `useAuth` rather than the context directly.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */

export { useAuthContext as useAuth } from '../context/AuthContext';
