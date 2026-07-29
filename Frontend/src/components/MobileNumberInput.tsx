import React from 'react';
import { sanitizeMobileInput, isValidIndianMobile } from '../utils/validation';

interface MobileNumberInputProps {
  /** Current 10-digit value (no country code, digits only). */
  value: string;
  onChange: (digitsOnly: string) => void;
  /**
   * Drives both the placeholder ("Enter {label}") and the inline
   * validation message ("Please enter a valid {label}").
   * e.g. "Mobile Number" | "Alternate Mobile Number" | "WhatsApp Number" | "Parent Mobile Number"
   */
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** Shows the red "Please enter a valid 10-digit Indian mobile number" hint once the user has typed something invalid. */
  showValidation?: boolean;
  /** Fired on blur — used by forms to trigger a live duplicate-number check. */
  onBlur?: () => void;
  /**
   * External error (e.g. "This mobile number is already registered." from a
   * duplicate-check, or a required-field message) shown in the same red style
   * as the built-in validation message, replacing it when present.
   */
  error?: string | null;
}

/**
 * Standardized Indian mobile-number field used across every form in the app
 * (Mobile, Alternate Mobile, WhatsApp, Parent Mobile, Contact Phone, etc.).
 *
 * - Always shows a fixed "+91" India country-code chip (India is the only
 *   supported country for student/teacher/parent contact numbers).
 * - Restricts input to digits only, capped at 10 characters — letters and
 *   symbols simply cannot be typed.
 * - Placeholder mirrors the field label ("Enter Mobile Number", "Enter
 *   WhatsApp Number", ...) — no sample numbers are ever shown.
 */
const MobileNumberInput: React.FC<MobileNumberInputProps> = ({
  value,
  onChange,
  label = 'Mobile Number',
  placeholder,
  required = false,
  disabled = false,
  id,
  name,
  className = '',
  showValidation = true,
  onBlur,
  error,
}) => {
  const digits = sanitizeMobileInput(value || '');
  const showError = (showValidation && digits.length > 0 && digits.length === 10 && !isValidIndianMobile(digits)) || !!error;
  const showIncomplete = showValidation && digits.length > 0 && digits.length < 10 && !error;

  return (
    <div className="w-full">
      <div
        className={`mobile-number-input flex items-stretch w-full bg-white dark:bg-[#1e293b] border rounded-[10px] overflow-hidden focus-within:ring-4 transition-all shadow-sm ${
          showError ? 'border-rose-300 dark:border-rose-400/40 focus-within:ring-rose-500/10 focus-within:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus-within:border-primary focus-within:ring-primary/5'
        } ${disabled ? 'bg-gray-50 dark:bg-[#283548] opacity-70' : ''} ${className}`}
      >
        {/* Fixed India (+91) country code chip. Uses an inline SVG flag rather than the
            🇮🇳 emoji — flag emoji silently falls back to plain "IN" letters on many
            Windows/Chrome builds, which is the broken look this replaces. */}
        <div
          className="flex items-center gap-1.5 pl-3 pr-2.5 bg-gray-50 dark:bg-[#283548] border-r border-gray-200 dark:border-[#334155] rounded-l-[10px] text-sm font-bold text-gray-700 dark:text-[#cbd5e1] select-none shrink-0"
          aria-label="Country code: India (+91)"
          title="India (+91)"
        >
          <svg width="18" height="13" viewBox="0 0 18 13" className="rounded-[2px] shrink-0 ring-1 ring-black/5" aria-hidden="true">
            <rect width="18" height="4.34" y="0" fill="#FF9933" />
            <rect width="18" height="4.33" y="4.34" fill="#FFFFFF" />
            <rect width="18" height="4.33" y="8.67" fill="#138808" />
            <circle cx="9" cy="6.5" r="1.4" fill="none" stroke="#000080" strokeWidth="0.4" />
            <circle cx="9" cy="6.5" r="0.32" fill="#000080" />
          </svg>
          <span className="tracking-tight">+91</span>
        </div>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={digits}
          placeholder={placeholder || `Enter ${label}`}
          maxLength={10}
          onChange={(e) => onChange(sanitizeMobileInput(e.target.value))}
          onBlur={onBlur}
          onKeyDown={(e) => {
            // Always allow Ctrl/Meta shortcuts: Ctrl+C (copy), Ctrl+X (cut),
            // Ctrl+A (select-all), Ctrl+V (paste), Ctrl+Z (undo), etc.
            if (e.ctrlKey || e.metaKey) return;
            // Block alphabetic / symbol keys outright (allow navigation & control keys)
            if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            // Intercept paste so we can strip non-digit chars (spaces, dashes, etc.)
            // before inserting — keeps the field digits-only even on paste.
            e.preventDefault();
            const pasted = e.clipboardData.getData('text') || '';
            let cleaned = pasted.replace(/\D/g, '');
            if (cleaned.length === 12 && cleaned.startsWith('91')) {
              cleaned = cleaned.slice(2);
            } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
              cleaned = cleaned.slice(1);
            }
            onChange(cleaned.slice(0, 10));
          }}
          className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm font-medium outline-none"
          style={{ border: 'none', borderRadius: '0px', outline: 'none', boxShadow: 'none' }}
        />
      </div>
      {showError && (
        <p className="mt-1.5 ml-1 text-[11px] font-semibold text-rose-500">
          {error || 'Please enter a valid 10-digit Indian mobile number'}
        </p>
      )}
      {showIncomplete && !showError && (
        <p className="mt-1.5 ml-1 text-[11px] font-medium text-gray-400 dark:text-[#64748b]">
          {10 - digits.length} digit{10 - digits.length === 1 ? '' : 's'} remaining
        </p>
      )}
    </div>
  );
};

export default MobileNumberInput;
