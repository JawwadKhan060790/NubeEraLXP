/**
 * Environment configuration.
 *
 * Reads from Vite's import.meta.env and derives the API base URL with the
 * same detection logic that was previously spread across api.ts and urlHelper.ts.
 * All environment-aware logic is centralised here — import from this file
 * rather than accessing import.meta.env directly in feature code.
 */

const isLocalNetwork = (): boolean => {
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  );
};

/**
 * Derives the full API base URL (including the `/api` suffix) from
 * VITE_API_URL or falls back to a sensible default for local development.
 */
const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  if (envUrl) {
    if (envUrl === '/api') return '/api';
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  if (isLocalNetwork()) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }

  return '/api';
};

/**
 * Derives the media / storage base URL (no `/api` suffix) for resolving
 * uploaded file URLs returned by the backend.
 */
const resolveMediaBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  if (envUrl) {
    return envUrl.replace(/\/api$/, '');
  }

  if (isLocalNetwork()) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return '';
};

export const ENV = {
  /** Whether the app is running in production mode. */
  IS_PRODUCTION:  import.meta.env.PROD as boolean,
  /** Whether the app is running in development mode. */
  IS_DEVELOPMENT: import.meta.env.DEV as boolean,
  /** Current Vite mode (e.g. "development", "production"). */
  MODE:           import.meta.env.MODE as string,

  /** Full API base URL including /api segment. */
  API_BASE_URL:   resolveApiBaseUrl(),
  /** Media/storage base URL (no /api segment) for resolving file URLs. */
  MEDIA_BASE_URL: resolveMediaBaseUrl(),

  /** Feature flags (set as VITE_FF_* env vars). */
  FEATURES: {
    AI_CHAT:   (import.meta.env.VITE_FF_AI_CHAT ?? 'true') === 'true',
    ECOMMERCE: (import.meta.env.VITE_FF_ECOMMERCE ?? 'true') === 'true',
  },
} as const;
