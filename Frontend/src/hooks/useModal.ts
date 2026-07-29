/**
 * useModal hook
 *
 * Manages open/close state for a modal together with an optional data
 * payload (e.g. the item being edited).
 *
 * Usage:
 *   const modal = useModal<Student>();
 *   // Open for create (no data):
 *   modal.open();
 *   // Open for edit:
 *   modal.open(selectedStudent);
 *   // In JSX:
 *   <StudentModal open={modal.isOpen} data={modal.data} onClose={modal.close} />
 */

import { useState, useCallback } from 'react';

interface UseModalResult<T = undefined> {
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Optional data associated with the open state (e.g. item being edited). */
  data: T | undefined;
  /** Opens the modal, optionally with data. */
  open: (data?: T) => void;
  /** Closes the modal and clears data. */
  close: () => void;
  /** Toggles open/close. */
  toggle: () => void;
}

export const useModal = <T = undefined>(): UseModalResult<T> => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData]     = useState<T | undefined>(undefined);

  const open   = useCallback((payload?: T) => { setData(payload); setIsOpen(true);  }, []);
  const close  = useCallback(() => { setIsOpen(false); setData(undefined); }, []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, data, open, close, toggle };
};
