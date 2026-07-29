/**
 * useApi hook
 *
 * A generic data-fetching hook that wraps any async service call.
 * Provides consistent loading / error / data state without boilerplate.
 *
 * Usage:
 *   const { data: students, isLoading, error, refetch } =
 *     useApi(() => studentService.getStudents());
 *
 *   // With dependencies (re-fetches when gradeId changes):
 *   const { data: attendance } = useApi(
 *     () => attendanceService.getAttendanceForGrade(gradeId, date),
 *     [gradeId, date],
 *   );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type ServiceFn<T> = () => Promise<T>;

interface UseApiResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useApi = <T>(
  fn: ServiceFn<T>,
  deps: unknown[] = [],
): UseApiResult<T> => {
  const [data, setData]         = useState<T | undefined>(undefined);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Keep the latest version of `fn` without re-triggering the effect.
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const execute = useCallback(() => {
    setLoading(true);
    setError(null);

    fnRef.current()
      .then(setData)
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ??
          (err instanceof Error ? err.message : 'An unexpected error occurred.');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []); // deps array intentionally empty — execute is stable

  // Re-run when external deps change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute(); }, [...deps, execute]);

  return { data, isLoading, error, refetch: execute };
};
