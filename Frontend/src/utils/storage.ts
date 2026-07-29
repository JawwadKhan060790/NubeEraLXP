/**
 * storage.ts — Typed localStorage wrapper
 *
 * All reads and writes go through these helpers so that:
 *  - Keys are never hard-coded as raw strings at call sites
 *  - JSON parse/stringify errors are caught silently
 *  - TypeScript can infer the stored shape via generics
 *
 * Key constants live in APP_CONFIG (src/app/config/appConfig.ts).
 */

// ── Core typed helpers ────────────────────────────────────────────────────────

/** Read a JSON-serialised value, returning `null` on missing or corrupt data. */
export const storageGet = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/** Write a JSON-serialisable value. Silently swallows quota errors. */
export const storageSet = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceededError — ignore; app still works with stale / missing data.
  }
};

/** Remove a single key. */
export const storageRemove = (...keys: string[]): void => {
  keys.forEach((k) => localStorage.removeItem(k));
};

/** Clear all keys — only call on logout, never on individual page cleanup. */
export const storageClear = (): void => {
  localStorage.clear();
};

// ── Raw string helpers (for tokens / simple flags) ───────────────────────────

/** Read a raw string value without JSON parsing. */
export const storageGetRaw = (key: string): string | null =>
  localStorage.getItem(key);

/** Write a raw string value. */
export const storageSetRaw = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch { /* ignore */ }
};

// ── Session-scoped helpers (sessionStorage) ───────────────────────────────────
// Use these for data that must not survive a browser close (e.g. draft forms).

export const sessionGet = <T>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const sessionSet = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
};

export const sessionRemove = (...keys: string[]): void => {
  keys.forEach((k) => sessionStorage.removeItem(k));
};
