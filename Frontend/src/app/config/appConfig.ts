/**
 * Application-level configuration constants.
 *
 * Non-environment values that control app behaviour globally.
 * Import from here rather than hard-coding these values in feature code.
 */

export const APP_CONFIG = {
  /** Application name shown in the browser tab and headers. */
  APP_NAME: "NubeEra LXP",

  /** Short tagline used on the login page. */
  APP_TAGLINE: "Learning Management System",

  /** Organisation name used in legal/email copy. */
  ORG_NAME: "NubeEra",

  /** API request timeout in milliseconds. */
  API_TIMEOUT_MS: 30_000,

  /** How many items to show per page by default. */
  DEFAULT_PAGE_SIZE: 20,

  /** Available page size options for the Pagination component. */
  PAGE_SIZE_OPTIONS: [10, 20, 30, 50, 100],

  /** Maximum file upload size (bytes) — 10 MB. */
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024,

  /** Local-storage key for the auth token. */
  TOKEN_KEY: "token",

  /** Local-storage key for the serialised user object. */
  USER_KEY: "user",

  /** Local-storage key for the remembered login identifier. */
  REMEMBER_ME_KEY: "rememberUser",

  /** Local-storage key for the active theme. */
  THEME_KEY: "nubeera-theme",

  /** Toast notification duration in milliseconds. */
  TOAST_DURATION_MS: 4_000,

  /** OTP expiry minutes shown in UI copy. */
  OTP_EXPIRY_MINUTES: 15,

  /** Maximum failed login attempts before lockout. */
  MAX_LOGIN_ATTEMPTS: 5,

  /** Lockout duration in minutes. */
  LOCKOUT_DURATION_MINUTES: 15,
} as const;
