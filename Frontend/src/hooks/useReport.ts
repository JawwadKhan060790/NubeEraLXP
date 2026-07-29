import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  EMPTY_REPORT_FILTER,
  exportReport,
  getAvailableReports,
  runReport,
  type ReportDefinitionSummary,
  type ReportExportFormat,
  type ReportFilter,
  type ReportResponse,
} from '../services/reportService';

/**
 * useReportDefinitions — loads the menu payload from `GET /reports` once and
 * groups it by `category`, so the Reports nav, the 18 category index pages,
 * and the "Custom Reports" picker all share one fetch/grouping implementation
 * instead of three.
 */
export function useReportDefinitions() {
  const [reports, setReports] = useState<ReportDefinitionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getAvailableReports()
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load reports.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => {
    const groups = new Map<string, ReportDefinitionSummary[]>();
    for (const report of reports) {
      const list = groups.get(report.category) ?? [];
      list.push(report);
      groups.set(report.category, list);
    }
    return groups;
  }, [reports]);

  return { reports, byCategory, isLoading, error };
}

interface UseReportOptions {
  /** The provider key, e.g. "student-attendance". */
  reportKey: string;
  /** Seed values merged over EMPTY_REPORT_FILTER on first render (e.g. a fixed studentId for a "my child" view). */
  initialFilter?: Partial<ReportFilter>;
  /** Set to false to defer the first run (e.g. while a parent page resolves a prerequisite filter). */
  autoRun?: boolean;
}

/**
 * useReport — the ONE data hook behind every report screen.
 *
 * Owns the filter state, calls `POST /reports/{key}/run` whenever the filter
 * changes (debounced on free-text search so each keystroke doesn't fire a
 * request), and exposes the resulting `ReportResponse` plus loading/error
 * state. `ReportPage` composes this with `ReportFilter`/`ReportGrid`/
 * `ReportChart`/`ReportExport` — no report-specific screen talks to axios or
 * builds its own fetch/paging plumbing, exactly mirroring how `useExport`
 * centralizes the export pipeline.
 */
export function useReport({ reportKey, initialFilter, autoRun = true }: UseReportOptions) {
  const [filter, setFilterState] = useState<ReportFilter>(() => ({ ...EMPTY_REPORT_FILTER, ...initialFilter }));
  const [data, setData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(autoRun);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const execute = useCallback(async (nextFilter: ReportFilter) => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await runReport(reportKey, nextFilter);
      if (seq === requestSeq.current) setData(response);
    } catch (err: any) {
      if (seq === requestSeq.current) {
        setError(err?.response?.data?.message ?? 'Failed to run this report.');
        setData(null);
      }
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, [reportKey]);

  // Debounce so typing in Search/filter fields doesn't fire a request per keystroke.
  useEffect(() => {
    if (!autoRun) return;
    const handle = window.setTimeout(() => { void execute(filter); }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey, filter, autoRun]);

  const setFilter = useCallback((patch: Partial<ReportFilter>) => {
    setFilterState((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilterState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((page_size: number) => {
    setFilterState((prev) => ({ ...prev, page_size, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setFilterState({ ...EMPTY_REPORT_FILTER, ...initialFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => execute(filter), [execute, filter]);

  return { filter, setFilter, setPage, setPageSize, reset, data, isLoading, error, refetch };
}

/**
 * useReportExport — the export-side counterpart to `useReport`, mirroring
 * `useExport()`'s shape (state + callback + toast feedback) so "Export to
 * Excel/CSV/PDF/Print" on a report behaves exactly like every other export
 * control in the app, just routed through the Reporting engine's single
 * `POST /reports/{key}/export` action (see services/reportService.ts).
 */
export function useReportExport() {
  const [isExporting, setIsExporting] = useState(false);

  const runExport = useCallback(async (key: string, filter: ReportFilter, format: ReportExportFormat, label: string) => {
    setIsExporting(true);
    try {
      const result = await exportReport(key, filter, format, label);
      if (result.kind === 'downloaded') {
        toast.success(`${label} exported`, { description: result.fileName });
      }
    } catch (error: any) {
      const data = error?.response?.data;
      toast.error(data?.message ?? 'Failed to generate the export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, runExport };
}
