/**
 * API Client
 *
 * Central Axios instance for ALL HTTP communication with the backend.
 * Every domain service imports this client — never create ad-hoc Axios
 * instances in feature code.
 *
 * Responsibilities:
 *  - Attach the JWT Authorization header on every request.
 *  - Unwrap the standard ApiResponse envelope so callers receive `data` directly.
 *  - Promote nested error messages to the top level for consistent error handling.
 *  - Redirect to /login on 401 responses (token expired / invalid).
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ENV } from '../app/config/environment';
import { APP_CONFIG } from '../app/config/appConfig';

// ── Create Axios instance ──────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT token ──────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      // Forward the school selected in the UI (SchoolSelectorContext) so the
      // backend's TenantMiddleware / TenantService can resolve the effective
      // SchoolId for this request. Required for Requirement 3/4 (Teacher
      // school-switching + per-school data visibility) to take effect on any
      // service that goes through this client rather than the legacy `api`
      // instance in api.ts — both must stay in sync since either may be used.
      const selectedSchoolId = localStorage.getItem('nubeera_selected_school_id') || localStorage.getItem('veriton_selected_school_id');
      if (selectedSchoolId) {
        config.headers['X-School-Id'] = selectedSchoolId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: unwrap envelope + handle 401 ────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    /**
     * Backend wraps every successful response in:
     *   { success: true, data: <payload>, message: "...", status_code: 200 }
     *
     * Unwrap so every caller receives the payload directly.
     */
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    /**
     * Promote the inner `data.message` to the top level so callers can read
     * `err.response.data.message` consistently regardless of nesting depth.
     */
    if (error.response?.data && typeof error.response.data === 'object') {
      const inner = error.response.data.data;
      if (inner?.message) {
        error.response.data.message = inner.message;
      }
    }

    /**
     * On 401 (token expired / missing), clear credentials and redirect to
     * login — unless the user is already on the login page.
     */
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const reqUrl = error.config?.url || '';

      if (currentPath !== '/login' && (!token || reqUrl.includes('/auth/me') || reqUrl.includes('/auth/refresh') || reqUrl.includes('/auth/validate'))) {
        localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
        localStorage.removeItem(APP_CONFIG.USER_KEY);
        localStorage.removeItem('nubeera_selected_school_id');
        localStorage.removeItem('veriton_selected_school_id');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ── Convenience typed wrappers ────────────────────────────────────────────────

/**
 * Perform a GET request and return the unwrapped payload.
 */
export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  apiClient.get<T>(url, config).then((r) => r.data as T);

/**
 * Perform a POST request and return the unwrapped payload.
 */
export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.post<T>(url, data, config).then((r) => r.data as T);

/**
 * Perform a PUT request and return the unwrapped payload.
 */
export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.put<T>(url, data, config).then((r) => r.data as T);

/**
 * Perform a PATCH request and return the unwrapped payload.
 */
export const patch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.patch<T>(url, data, config).then((r) => r.data as T);

/**
 * Perform a DELETE request and return the unwrapped payload.
 */
export const del = <T>(url: string, config?: AxiosRequestConfig) =>
  apiClient.delete<T>(url, config).then((r) => r.data as T);

export default apiClient;
