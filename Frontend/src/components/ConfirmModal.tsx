import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 dark:bg-rose-500/15',
      iconColor: 'text-rose-500 dark:text-rose-400',
      confirmBtn: 'bg-rose-500 hover:bg-rose-600',
    },
    warning: {
      iconBg: 'bg-amber-50 dark:bg-amber-500/15',
      iconColor: 'text-amber-500 dark:text-amber-400',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600',
    },
    info: {
      iconBg: 'bg-brand-50 dark:bg-brand-500/15',
      iconColor: 'text-brand-500 dark:text-brand-400',
      confirmBtn: 'bg-brand-600 hover:bg-brand-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center p-4 animate-in fade-in duration-200 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1e293b] rounded-[10px] shadow-xl border border-gray-100 dark:border-[#334155] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
           <div className="flex items-center gap-4 mb-4">
              <div className={`w-10 h-10 ${styles.iconBg} rounded-[4px] flex items-center justify-center`}>
                <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
           </div>
           <p className="text-sm text-gray-500 dark:text-[#94a3b8] font-medium leading-relaxed">{message}</p>
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-[#334155] text-gray-700 dark:text-[#e2e8f0] rounded-[4px] font-bold text-xs hover:bg-gray-50 dark:hover:bg-[#283548] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); }}
            className={`flex-1 px-4 py-2 ${styles.confirmBtn} text-white rounded-[4px] font-bold text-xs transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
