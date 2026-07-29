import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordPolicyTrackerProps {
  value: string;
  touched: boolean;
}

export const checkPasswordPolicy = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };
};

export const isPasswordValid = (password: string) => {
  const checks = checkPasswordPolicy(password);
  return Object.values(checks).every(Boolean);
};

const PasswordPolicyTracker: React.FC<PasswordPolicyTrackerProps> = ({ value, touched }) => {
  const checks = checkPasswordPolicy(value || '');
  const allMet = Object.values(checks).every(Boolean);
  const show = touched && !allMet;

  const policies = [
    { label: 'At least 8 characters', met: checks.minLength },
    { label: 'One uppercase letter (A-Z)', met: checks.hasUpper },
    { label: 'One lowercase letter (a-z)', met: checks.hasLower },
    { label: 'One digit (0-9)', met: checks.hasDigit },
    { label: 'One special character (e.g. @, #, $, %)', met: checks.hasSpecial }
  ];

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        show ? 'max-h-48 opacity-100 mt-2 mb-2' : 'max-h-0 opacity-0 mt-0 mb-0 pointer-events-none'
      }`}
    >
      <div className="p-3 bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-[#334155] space-y-1.5">
        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider mb-2">Password Requirements</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {policies.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-semibold">
              {p.met ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              )}
              <span className={p.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-[#94a3b8]'}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PasswordPolicyTracker;
