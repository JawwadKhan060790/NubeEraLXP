import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useExport } from '../../hooks/useExport';

export interface ExportButtonProps {
  /** API path relative to the axios baseURL, e.g. '/students/export'. */
  endpoint: string;
  /** Used only if the server doesn't supply a Content-Disposition filename. */
  fallbackFileName?: string;
  /** Friendly resource name shown on the button and in toast feedback. */
  label?: string;
  className?: string;
}

/**
 * ExportButton — the ONE Excel-export control for the entire app.
 *
 * Every list/report screen (Students, Teachers, Courses, …) renders this same
 * component pointed at its own `GET {resource}/export` endpoint — that's the
 * entire integration surface. It never talks to axios directly; all of the
 * fetch/blob/download/toast plumbing lives in useExport()/exportService(),
 * so there is exactly one place that logic can have a bug, and exactly one
 * place to extend it (e.g. background-job exports for 100k+ row reports later).
 *
 * Visual language matches the existing toolbar buttons (Students "Enroll
 * Student", "Academic Promotion", etc.): rounded-[4px], uppercase tracking-
 * widest 10px label, lucide icon + text, shadow-sm — just in the neutral
 * "secondary action" treatment so it doesn't compete with each page's primary
 * action button.
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  endpoint,
  fallbackFileName = 'export.xlsx',
  label = 'Export to Excel',
  className = '',
}) => {
  const { isExporting, exportToExcel } = useExport();

  return (
    <button
      type="button"
      onClick={() => exportToExcel({ endpoint, fallbackFileName, label })}
      disabled={isExporting}
      title={`Download ${label} as an Excel workbook`}
      className={`bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] px-4 py-2.5 rounded-[4px] font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-primary/40 hover:text-primary transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:text-slate-700 dark:disabled:hover:text-[#e2e8f0] ${className}`}
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {isExporting ? 'Exporting…' : label}
    </button>
  );
};

export default ExportButton;
