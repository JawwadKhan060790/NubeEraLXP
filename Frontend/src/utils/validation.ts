/**
 * Shared form validation & input-sanitization helpers.
 *
 * Centralizing these keeps every form (Students, Teachers, Schools, Checkout,
 * profile, registration, etc.) behaving identically — same Indian mobile-number
 * rules, same email pattern, same "no double spaces" / "trim" behaviour, and the
 * same wording for validation messages.
 */

/** Standard RFC-5322-ish email pattern used across the app. */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** A valid Indian mobile number: exactly 10 digits, first digit 6-9. */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Strips everything except digits and caps the result at 10 characters.
 * Use this inside onChange handlers for any mobile/phone/WhatsApp field so
 * users physically cannot type letters, symbols, or more than 10 digits.
 */
export const sanitizeMobileInput = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 10);

/** True when the value is a valid 10-digit Indian mobile number. */
export const isValidIndianMobile = (value: string): boolean =>
  INDIAN_MOBILE_REGEX.test(sanitizeMobileInput(value));

/** True when the value matches a standard email format. */
export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());

/**
 * Removes leading/trailing whitespace AND collapses any run of internal
 * whitespace down to a single space. Use this on blur (or before submit)
 * for name/address/free-text fields.
 */
export const trimAndCollapseSpaces = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

/**
 * Use inside onChange for free-text fields to stop a user from typing more
 * than one consecutive space (it still allows a single trailing space while
 * typing, but collapses runs of 2+ as they're entered).
 */
export const preventConsecutiveSpaces = (value: string): string =>
  value.replace(/ {2,}/g, ' ');

/** Keeps only digits — for numeric-only fields (IDs, pincodes, OTPs, amounts). */
export const numericOnly = (value: string): string => value.replace(/\D/g, '');

/** Keeps only digits and a single leading sign / decimal point — for amounts. */
export const decimalOnly = (value: string): string => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
};

/** Standard, friendly validation messages — keep wording identical everywhere. */
export const VALIDATION_MESSAGES = {
  required: (label: string) => `${label} is required`,
  invalidEmail: 'Please enter a valid email address',
  invalidMobile: 'Please enter a valid 10-digit Indian mobile number',
  noAlphabetsInPhone: 'Phone numbers can only contain digits',
  noConsecutiveSpaces: 'Remove the extra spaces',
} as const;

/**
 * Generic "is this field empty after trimming" check — use for required-field
 * validation so that a string of only spaces doesn't pass as a valid value.
 */
export const isBlank = (value: string | undefined | null): boolean =>
  !value || value.trim().length === 0;
