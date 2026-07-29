import api from './api';
import { downloadExport } from './exportService';

/**
 * Generic Reporting framework — frontend half.
 *
 * Mirrors the Excel Export framework's split (services/exportService.ts +
 * hooks/useExport.ts + components/export/ExportButton.tsx): ONE service that
 * talks to the THREE generic endpoints behind `IReportService`/`ReportsController`
 * (GET /reports, POST /reports/{key}/run, POST /reports/{key}/export), and a
 * shared set of `Report*` components/hooks that every one of the 18 report
 * categories renders. Adding report #19 means registering one more provider
 * server-side and pointing a `<ReportPage reportKey="..." />` at it — nothing
 * here changes. "Do NOT create separate report engines" applies to the
 * frontend exactly as much as the backend.
 *
 * `api`'s response interceptor already unwraps the `ApiResponse<T>` envelope
 * (`{ success, message, data, errors, status_code }` -> `data`), and the
 * backend's global `JsonNamingPolicy.SnakeCaseLower` means every property below
 * arrives as snake_case — these types describe the wire shape exactly.
 */

// ─── Enums (mirror NubeEra.Application.Common.Reporting.ReportEnums) ─────────

export type ReportColumnType = 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'percent';
export type ReportChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area';
export type ReportKpiFormat = 'number' | 'percent' | 'currency' | 'decimal';
export type ReportExportFormat = 'excel' | 'csv' | 'pdf' | 'print';

/** Maps the wire format to the integer `ReportExportFormat` the backend understands (Excel=0, Csv=1). PDF/Print never reach the server — see `exportReport` below. */
const SERVER_EXPORT_FORMAT: Record<'excel' | 'csv', number> = { excel: 0, csv: 1 };

// ─── Filters (mirrors ReportFilterDto exactly — the ONE shared filter shape) ─

export interface ReportFilter {
  school_id?: string | null;
  academic_year?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  month?: number | null;
  quarter?: number | null;
  year?: number | null;
  grade_id?: string | null;
  subject_id?: string | null;
  course_id?: string | null;
  batch_id?: string | null;
  student_id?: string | null;
  parent_id?: string | null;
  teacher_id?: string | null;
  staff_id?: string | null;
  principal_id?: string | null;
  status?: string | null;
  search?: string | null;
  sort_by?: string | null;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  advanced_filters?: Record<string, string> | null;
  saved_filter_name?: string | null;
}

/** A fresh, empty filter — every `ReportPage` starts from this so "Reset" always has a well-defined target. */
export const EMPTY_REPORT_FILTER: ReportFilter = {
  sort_direction: 'asc',
  page: 1,
  page_size: 25,
};

// ─── Response contracts (mirror the DTOs returned by the 3 endpoints) ───────

export interface ReportDefinitionSummary {
  key: string;
  category: string;
  title: string;
  description?: string | null;
}

export interface ReportColumn {
  key: string;
  header: string;
  type: ReportColumnType;
  format?: string | null;
  width?: number | null;
  sortable: boolean;
  visible: boolean;
  export_only: boolean;
  grid_only: boolean;
}

export interface ReportKpi {
  key: string;
  label: string;
  value: number;
  format: ReportKpiFormat;
  previous_value?: number | null;
  icon?: string | null;
}

export interface ReportChartSeries {
  name: string;
  data: number[];
  color?: string | null;
}

export interface ReportChart {
  key: string;
  title: string;
  type: ReportChartType;
  labels: string[];
  series: ReportChartSeries[];
  value_label?: string | null;
}

export type ReportRow = Record<string, unknown>;

export interface ReportResponse {
  key: string;
  category: string;
  title: string;
  description?: string | null;
  columns: ReportColumn[];
  rows: ReportRow[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  kpis: ReportKpi[];
  charts: ReportChart[];
  applied_filters: ReportFilter;
  generated_at: string;
  generated_by?: string | null;
  summary_note?: string | null;
}

// ─── The three generic calls — every report in every category goes through these ─

/** GET /reports — the menu payload: every report the CALLER's role may run, ready to group by `category` for the 18-category nav and the Custom Reports picker. */
export async function getAvailableReports(): Promise<ReportDefinitionSummary[]> {
  const response = await api.get<ReportDefinitionSummary[]>('/reports');
  return response.data;
}

const COLUMN_TYPE_MAP: Record<number, ReportColumnType> = {
  0: 'text',
  1: 'number',
  2: 'currency',
  3: 'date',
  4: 'datetime',
  5: 'boolean',
  6: 'percent',
};

const CHART_TYPE_MAP: Record<number, ReportChartType> = {
  0: 'line',
  1: 'bar',
  2: 'pie',
  3: 'donut',
  4: 'area',
};

const getColumnType = (t: unknown): ReportColumnType => {
  if (typeof t === 'number') return COLUMN_TYPE_MAP[t] ?? 'text';
  if (typeof t === 'string') return t.toLowerCase() as ReportColumnType;
  return 'text';
};

const getChartType = (t: unknown): ReportChartType => {
  if (typeof t === 'number') return CHART_TYPE_MAP[t] ?? 'bar';
  if (typeof t === 'string') return t.toLowerCase() as ReportChartType;
  return 'bar';
};

/** POST /reports/{key}/run — executes one report against the current page of the supplied filter and returns columns + rows + KPIs + charts + paging in one envelope. */
export async function runReport(key: string, filter: ReportFilter): Promise<ReportResponse> {
  const response = await api.post<ReportResponse>(`/reports/${encodeURIComponent(key)}/run`, filter);
  const data = response.data;
  if (data) {
    if (data.columns) {
      data.columns = data.columns.map((c) => ({
        ...c,
        type: getColumnType(c.type),
      }));
    }
    if (data.charts) {
      data.charts = data.charts.map((c) => ({
        ...c,
        type: getChartType(c.type),
      }));
    }
  }
  return data;
}

const REPORT_EXPORT_EXTENSION: Record<'excel' | 'csv', string> = { excel: 'xlsx', csv: 'csv' };

/**
 * Exports a report against the FULL filtered set — "Export only filtered data".
 *
 * Excel/CSV are produced server-side by the same `IReportExportService` engine
 * (`POST /reports/{key}/export`, streamed and saved via the shared
 * `downloadExport` helper — identical plumbing to every pilot module's export).
 *
 * PDF/Print are *intentionally* client-side (mirrors `ReportsController`'s own
 * doc comment: "PDF/Print are intentionally client-side... requesting them here
 * simply isn't wired up, by design"): the browser already has the on-screen
 * report — including the header/logo/filters/summary block `ReportExport`
 * renders — so `window.print()` (with "Save as PDF" for the PDF case) reuses
 * that exact rendering instead of standing up a second layout engine.
 */
export async function exportReport(
  key: string,
  filter: ReportFilter,
  format: ReportExportFormat,
  fallbackTitle = 'report'
): Promise<{ kind: 'downloaded'; fileName: string } | { kind: 'print' }> {
  if (format === 'pdf' || format === 'print') {
    window.print();
    return { kind: 'print' };
  }

  const fallbackFileName = `${fallbackTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${REPORT_EXPORT_EXTENSION[format]}`;

  const fileName = await downloadExport({
    endpoint: `/reports/${encodeURIComponent(key)}/export`,
    method: 'post',
    data: { key, filter, format: SERVER_EXPORT_FORMAT[format] },
    fallbackFileName,
  });

  return { kind: 'downloaded', fileName };
}
