/**
 * formatters.ts — Display formatting utilities
 *
 * All date, number, currency, and string formatting logic lives here.
 * Import from '@/utils/formatters' or from the barrel '@/utils'.
 */

// ── Date ──────────────────────────────────────────────────────────────────────

/** e.g. "12 Jun 2025" */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

/** e.g. "12 Jun 2025, 3:45 PM" */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

/** e.g. "3:45 PM" */
export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

/** "2 hours ago", "just now", "3 days ago" */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const ms   = Date.now() - new Date(date).getTime();
  const secs = Math.round(ms / 1000);
  if (secs <   60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins <   60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs  = Math.round(mins / 60);
  if (hrs  <   24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs  / 24);
  if (days <   30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(date);
};

// ── Number & currency ─────────────────────────────────────────────────────────

/** e.g. "₹1,23,456.00" */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency = 'INR',
): string => {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
};

/** e.g. "1,23,456" */
export const formatNumber = (value: number | string | null | undefined): string => {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
};

/** e.g. 1234567 → "12.3 L", 12345678 → "1.2 Cr" */
export const formatCompactNumber = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return '—';
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)} Cr`;
  if (value >= 1_00_000)    return `${(value / 1_00_000).toFixed(1)} L`;
  if (value >= 1_000)       return `${(value / 1_000).toFixed(1)} K`;
  return String(value);
};

/** e.g. 0.756 → "75.6%" */
export const formatPercent = (value: number | null | undefined, decimals = 1): string => {
  if (value == null || isNaN(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
};

// ── String ────────────────────────────────────────────────────────────────────

/** "john doe" → "John Doe" */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
};

/** "john.doe@example.com" → "John Doe" (from email prefix) */
export const nameFromEmail = (email: string): string =>
  toTitleCase(email.split('@')[0].replace(/[._-]/g, ' '));

/** Truncate with ellipsis: truncate("Hello World", 8) → "Hello Wo…" */
export const truncate = (str: string | null | undefined, max: number): string => {
  if (!str) return '';
  return str.length <= max ? str : `${str.slice(0, max)}…`;
};

/** "admin" → "Admin", "super_admin" → "Super Admin" */
export const formatRole = (role: string | null | undefined): string =>
  toTitleCase((role ?? '').replace(/_/g, ' '));

// ── File size ─────────────────────────────────────────────────────────────────

/** e.g. 1536 → "1.5 KB" */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null || isNaN(bytes)) return '—';
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 ** 2)     return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)     return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};
