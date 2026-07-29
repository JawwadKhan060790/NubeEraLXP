import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string | null;
  className?: string;
}

/**
 * Shared inline field-level error message — red text shown directly below a
 * form control, replacing the old pattern of surfacing every validation issue
 * through a toast notification. Renders nothing when there is no message, so
 * it can be dropped under any input unconditionally:
 *
 *   <input ... />
 *   <FieldError message={errors.email} />
 */
const FieldError: React.FC<FieldErrorProps> = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <p className={`mt-1.5 ml-1 flex items-center gap-1 text-[11px] font-semibold text-rose-500 ${className}`}>
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
};

export default FieldError;
