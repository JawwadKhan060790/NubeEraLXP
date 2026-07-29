import api from './api';

/**
 * Generic Excel Export framework — frontend half.
 *
 * The backend already exposes one shared engine (IExcelExportService /
 * ExcelExportService) behind a per-module `GET {resource}/export` action that
 * reuses the exact same authorized query (and [Authorize] policy) as that
 * module's list endpoint — see StudentsController.Export / TeachersController.Export.
 *
 * This file is the single frontend counterpart: a pure "call the endpoint,
 * stream the workbook the server already built and authorized, save it"
 * helper. No module should write its own download plumbing — only the
 * endpoint path and a fallback filename differ between modules.
 */
export interface ExportOptions {
  /** API path relative to the axios baseURL, e.g. '/students/export'. */
  endpoint: string;
  /** Used only if the server response has no Content-Disposition filename. */
  fallbackFileName?: string;
  /**
   * HTTP method to call the endpoint with. Defaults to 'get' (every pilot
   * module's `GET {resource}/export`). The Reporting module's single export
   * action is `POST /reports/{key}/export` (its filter/format payload doesn't
   * belong in a query string — see ReportsController.ExportReport); rather
   * than fork a second download helper, this one extra option lets it reuse
   * the exact same blob/filename/save plumbing.
   */
  method?: 'get' | 'post';
  /** Request body — only relevant when `method` is 'post'. */
  data?: unknown;
}

const CONTENT_DISPOSITION_FILENAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

function resolveFileName(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition === 'string') {
    const match = CONTENT_DISPOSITION_FILENAME.exec(contentDisposition);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return fallback;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Downloads the workbook returned by an export endpoint and saves it via the
 * browser's normal download flow. Triggers a real file save — no preview, no
 * new tab — matching how users expect "Export to Excel" to behave.
 */
export async function downloadExport({ endpoint, fallbackFileName = 'export.xlsx', method = 'get', data }: ExportOptions): Promise<string> {
  const response = method === 'post'
    ? await api.post(endpoint, data, { responseType: 'blob' })
    : await api.get(endpoint, { responseType: 'blob' });

  const blob: Blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: response.headers?.['content-type'] || XLSX_MIME });

  const fileName = resolveFileName(response.headers?.['content-disposition'], fallbackFileName);

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);

  return fileName;
}
