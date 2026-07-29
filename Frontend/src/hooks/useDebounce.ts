/**
 * useDebounce hook
 *
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity.  Use this for search inputs to avoid firing an API call on every
 * keystroke.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 400);
 *   useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */

import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay = 400): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
