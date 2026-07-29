import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * useConfirm — drop-in replacement for window.confirm()
 *
 * Usage:
 *   const { confirmState, requestConfirm } = useConfirm();
 *
 *   // In handler:
 *   const ok = await requestConfirm({ title: 'Delete?', message: 'This is permanent.' });
 *   if (!ok) return;
 *   // ... proceed with action
 *
 *   // In JSX:
 *   <ConfirmModal
 *     open={confirmState.open}
 *     title={confirmState.title ?? ''}
 *     message={confirmState.message}
 *     confirmLabel={confirmState.confirmLabel}
 *     cancelLabel={confirmState.cancelLabel}
 *     variant={confirmState.variant}
 *     onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => {}}
 *     onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => {}}
 *   />
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    message: '',
  });

  const requestConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        ...options,
        resolve: (value: boolean) => {
          setConfirmState((prev) => ({ ...prev, open: false, resolve: undefined }));
          resolve(value);
        },
      });
    });
  }, []);

  return { confirmState, requestConfirm };
}
