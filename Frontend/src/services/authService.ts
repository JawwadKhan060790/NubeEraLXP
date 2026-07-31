/**
 * Auth Service
 *
 * Handles all authentication API calls: login, register, password management.
 * Components and hooks must use this service — never call the API directly.
 */

import { get, post, put } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { APP_CONFIG } from '../app/config/appConfig';
import type {
  AuthResponse,
  User,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth.types';

/** Authenticates the user and returns a token + user profile. */
const login = (credentials: LoginRequest): Promise<AuthResponse> =>
  post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);

/** Registers a new user account. */
const register = (payload: RegisterRequest): Promise<{ message: string }> =>
  post(API_ENDPOINTS.AUTH.REGISTER, payload);

/** Fetches the currently authenticated user's profile. */
const getMe = (): Promise<User> =>
  get<User>(API_ENDPOINTS.AUTH.ME);

/** Initiates a password reset by sending an OTP to the user's email. */
const forgotPassword = (payload: ForgotPasswordRequest): Promise<{ message: string }> =>
  post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);

/** Completes the password reset using the OTP received by email. */
const resetPassword = (payload: ResetPasswordRequest): Promise<{ message: string }> =>
  post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);

/** Changes the password for the currently authenticated user. */
const changePassword = (payload: ChangePasswordRequest): Promise<{ message: string }> =>
  put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, payload);

/** Resets another user's password (admin action). */
const adminResetPassword = (
  userId: string,
  payload: { password: string },
): Promise<{ message: string }> =>
  put(API_ENDPOINTS.USERS.RESET_PASSWORD(userId), payload);

// ── Local storage helpers ────────────────────────────────────────────────────

/** Persists the token and user profile to localStorage after a successful login. */
const persistSession = (token: string, user: User): void => {
  localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
  localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));

  // Clear any school selected during a PREVIOUS session before this one starts.
  // Without this, a stale 'nubeera_selected_school_id' left over from an earlier
  // login (e.g. a SuperAdmin who had filtered to School A) gets attached as the
  // X-School-Id header on this brand-new session's very first requests, silently
  // scoping a Staff/Teacher/Admin account to the wrong (or a nonexistent) school —
  // this was the root cause behind "Staff dashboard / Student panel show no data"
  // and a contributing cause of grades appearing to leak across schools.
  localStorage.removeItem('nubeera_selected_school_id');
  localStorage.removeItem('veriton_selected_school_id');
};

/** Clears the session from localStorage (called on logout or 401). */
const clearSession = (): void => {
  localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
  localStorage.removeItem(APP_CONFIG.USER_KEY);
  localStorage.removeItem('nubeera_selected_school_id');
  localStorage.removeItem('veriton_selected_school_id');
};

/** Reads the current session from localStorage.  Returns null when not authenticated. */
const readSession = (): { token: string; user: User } | null => {
  try {
    const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    const raw   = localStorage.getItem(APP_CONFIG.USER_KEY);

    if (!token || token === 'null' || token === 'undefined') return null;
    if (!raw   || raw   === 'null' || raw   === 'undefined') return null;

    const user = JSON.parse(raw) as User;
    if (!user || typeof user !== 'object') return null;

    return { token, user };
  } catch {
    clearSession();
    return null;
  }
};

export const authService = {
  login,
  register,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  adminResetPassword,
  persistSession,
  clearSession,
  readSession,
};
