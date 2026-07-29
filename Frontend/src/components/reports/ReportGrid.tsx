import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Loader2 } from 'lucide-react';
import Pagination from '../Pagination';
import type { ReportColumn, ReportFilter, ReportRow } from '../../services/reportService';

export interface ReportGridProps {
  columns: ReportColumn[];
  rows: ReportRow[];
  totalCount: number;
  filter: ReportFilter;
  onSortChange: (sortBy: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
}

function formatCell(value: unknown, type: ReportColumn['type'], format?: string | null): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (type) {
    case 'currency': {
      const n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : String(value);
    }
    case 'percent': {
      const n = Number(value);
      return Number.isFinite(n) ? `${n}%` : String(value);
    }
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString() : String(value);
    }
    case 'date': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    case 'datetime': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return format ? String(value) : String(value);
  }
}

function renderCellContent(value: unknown, col: ReportColumn, cellText: string): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';

  if (col.key === 'status' || col.key === 'outcome') {
    const valStr = String(value).toLowerCase();
    let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300';
    if (valStr === 'present' || valStr === 'active' || valStr === 'completed' || valStr === 'pass' || valStr === 'passed' || valStr === 'success') {
      badgeClass = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
    } else if (valStr === 'absent' || valStr === 'inactive' || valStr === 'cancelled' || valStr === 'fail' || valStr === 'failed' || valStr === 'error') {
      badgeClass = 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30';
    } else if (valStr === 'late' || valStr === 'pending' || valStr === 'warning') {
      badgeClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30';
    } else if (valStr === 'excused' || valStr === 'scheduled' || valStr === 'info') {
      badgeClass = 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-900/30';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
        {cellText}
      </span>
    );
  }

  if (col.type === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${value ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/30'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  return cellText;
}

/**
 * ReportGrid — the ONE results table every report renders.
 *
 * Entirely column-driven: it has no idea what "Student Attendance" or
 * "Financial Orders" means, it just renders whatever `ReportColumnDefinition[]`
 * /`rows` the generic `POST /reports/{key}/run` envelope returned, formats
 * each cell by its declared `type` (Text/Number/Currency/Percent/Date/
 * DateTime/Boolean — the same enum the backend's column factories emit), and
 * wires server-side sort/pagination through the shared `ReportFilterDto`
 * (`sort_by`/`sort_direction`/`page`/`page_size`) — exactly how the directive's
 * "Performance: server-side pagination for 100,000+ records" requirement
 * has to work: the grid never holds more than one page of rows in memory.
 * Reuses the app's existing `<Pagination>` so paging looks identical to every
 * other list screen.
 */
const ReportGrid: React.FC<ReportGridProps> = ({
  columns,
  rows,
  totalCount,
  filter,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) => {
  const visibleColumns = columns.filter((c) => c.visible && !c.export_only);
  const page = filter.page ?? 1;
  const pageSize = filter.page_size ?? 25;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/5 dark:from-[#1e293b] dark:to-[#0f172a]/60 border border-slate-200 dark:border-[#334155] rounded-3xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#283548] border-b border-slate-200 dark:border-[#334155]">
              {visibleColumns.map((col) => {
                const isSorted = filter.sort_by === col.key;
                const Icon = !col.sortable ? null : isSorted ? (filter.sort_direction === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    style={col.width ? { minWidth: col.width, width: col.width } : undefined}
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#94a3b8] whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-primary' : ''}`}
                    onClick={col.sortable ? () => onSortChange(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {Icon && <Icon className={`w-3 h-3 ${isSorted ? 'text-primary' : 'text-slate-300'}`} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs font-semibold">Running report…</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="w-7 h-7" />
                    <span className="text-xs font-semibold">No data matches the current filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 dark:border-[#283548]/40 last:border-0 hover:bg-slate-50/80 dark:hover:bg-[#283548]/60 transition-colors"
                >
                  {visibleColumns.map((col) => {
                    const cellValue = row[col.key];
                    const cellText = formatCell(cellValue, col.type, col.format);
                    const isLongText = col.type === 'text' || col.type === undefined;
                    return (
                      <td
                        key={col.key}
                        title={isLongText ? cellText : undefined}
                        className={`px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] ${isLongText ? 'max-w-[260px] truncate' : 'whitespace-nowrap'}`}
                      >
                        {renderCellContent(cellValue, col, cellText)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};

export default ReportGrid;
