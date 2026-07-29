/**
 * Auth Context
 *
 * Centralised authentication state for the entire application.
 * Replaces all `localStorage.getItem('user')` / `localStorage.getItem('token')`
 * calls spread across components with a clean React context hook.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuthContext();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/authService';
import type { User, LoginRequest } from '../types/auth.types';
import type { RoleValue } from '../constants/roles';
import { APP_CONFIG } from '../app/config/appConfig';

// ── Context shape ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The currently authenticated user, or null when unauthenticated. */
  user: User | null;
  /** True when a valid session exists. */
  isAuthenticated: boolean;
  /** True during the initial auth check (prevents flash of login page). */
  isLoading: boolean;
  /** Performs login, persists session, and updates context state. */
  login: (credentials: LoginRequest) => Promise<User>;
  /** Clears session and resets state. */
  logout: () => void;
  /** Updates the user object in context after a profile edit. */
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]               = useState<User | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  // ── Bootstrap: restore session from localStorage on mount ─────────────────

  useEffect(() => {
    const session = authService.readSession();
    if (session) {
      setUser(session.user);
    }
    setIsLoading(false);
  }, []);

  // ── Update <html data-role="..."> when role changes ───────────────────────

  useEffect(() => {
    if (user?.utype) {
      document.documentElement.setAttribute('data-role', user.utype);
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [user]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(async (credentials: LoginRequest): Promise<User> => {
    const { token, user: loggedInUser } = await authService.login(credentials);
    authService.persistSession(token, loggedInUser);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback((): void => {
    authService.clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: Partial<User>): void => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updated };
      // Keep localStorage in sync.
      localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  // ── Memoised value ────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useAuthContext — access the current auth state anywhere inside the tree.
 * Must be used inside <AuthProvider>.
 */
export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
};

// ── Convenience role helpers exported from this module ────────────────────────

/**
 * Returns true when the current user's utype matches one of the given roles.
 * Components should prefer usePermissions() for feature-level checks, but
 * this helper is useful for layout-level conditionals.
 */
export const useIsRole = (...roles: RoleValue[]): boolean => {
  const { user } = useAuthContext();
  return roles.includes(user?.utype as RoleValue);
};
