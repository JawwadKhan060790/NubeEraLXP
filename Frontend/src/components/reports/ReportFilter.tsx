import React from 'react';
import { Loader2, RotateCcw, Search } from 'lucide-react';
import type { ReportFilter as ReportFilterState } from '../../services/reportService';

export interface ReportFilterFieldOption {
  value: string;
  label: string;
}

export interface ReportFilterProps {
  filter: ReportFilterState;
  onChange: (patch: Partial<ReportFilterState>) => void;
  onReset: () => void;
  /** Sort-by choices — keys must match the report's column keys (the provider's `keySelectors`). */
  sortOptions?: ReportFilterFieldOption[];
  /** Status choices, e.g. ["Active","Inactive"] or ["Scheduled","Completed","Cancelled"]. Free-text search is used when omitted. */
  statusOptions?: ReportFilterFieldOption[];
  /** Hide the date-range inputs for reports with no date dimension (e.g. directories). */
  showDateRange?: boolean;
  isLoading?: boolean;
}

const inputClass =
  'w-full bg-slate-50/80 dark:bg-[#283548]/80 border border-slate-200 dark:border-[#334155] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400 placeholder:font-normal dark:focus:bg-[#283548] focus:bg-white';
const labelClass = 'text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#64748b] mb-1.5 block';

/**
 * ReportFilter — the ONE filter bar every report screen renders.
 *
 * Surfaces the universal common filters from the directive's spec — Search,
 * Date Range, Status, Sorting, Pagination/page-size, Reset — that apply to
 * every report regardless of category. The dimension filters that need a
 * lookup source (School/Grade/Subject/Course/Batch/Student/Parent/Teacher/
 * Staff/Principal/Academic Year) are intentionally NOT hard-coded here: a
 * report screen that needs one passes it in as an extra control alongside
 * `<ReportFilter>` and merges it via the same `onChange` callback — the
 * shared `ReportFilterDto` already has a slot for every one of them, so
 * wiring a dropdown is the entire extension (see REPORTING_MODULE.md).
 * "Advanced/Saved Filters" map onto `advanced_filters`/`saved_filter_name`
 * for the same reason — they're per-report shapes layered on this shared bar,
 * not a one-size-fits-all widget.
 */
const ReportFilterBar: React.FC<ReportFilterProps> = ({
  filter,
  onChange,
  onReset,
  sortOptions,
  statusOptions,
  showDateRange = true,
  isLoading = false,
}) => {
  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/5 dark:from-[#1e293b] dark:to-[#0f172a]/60 border border-slate-200 dark:border-[#334155] rounded-3xl p-5 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="xl:col-span-2">
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter.search ?? ''}
              onChange={(e) => onChange({ search: e.target.value || null })}
              placeholder="Search this report…"
              aria-label="Search this report"
              className={`${inputClass} pl-9 pr-9`}
            />
            {isLoading && (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            )}
          </div>
        </div>

        {showDateRange && (
          <>
            <div>
              <label className={labelClass}>Date From</label>
              <input
                type="date"
                value={filter.date_from ? filter.date_from.slice(0, 10) : ''}
                onChange={(e) => onChange({ date_from: e.target.value || null })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date To</label>
              <input
                type="date"
                value={filter.date_to ? filter.date_to.slice(0, 10) : ''}
                onChange={(e) => onChange({ date_to: e.target.value || null })}
                className={inputClass}
              />
            </div>
          </>
        )}

        {statusOptions && statusOptions.length > 0 && (
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={filter.status ?? ''}
              onChange={(e) => onChange({ status: e.target.value || null })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">All statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {sortOptions && sortOptions.length > 0 && (
          <div>
            <label className={labelClass}>Sort By</label>
            <div className="flex gap-2">
              <select
                value={filter.sort_by ?? ''}
                onChange={(e) => onChange({ sort_by: e.target.value || null })}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Default</option>
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filter.sort_direction ?? 'asc'}
                onChange={(e) => onChange({ sort_direction: e.target.value as 'asc' | 'desc' })}
                className={`${inputClass} cursor-pointer w-24 shrink-0`}
                title="Sort direction"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="w-full bg-white dark:bg-[#1e293b]/40 border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:border-rose-200 hover:text-rose-600 transition-all outline-none flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed h-[42px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterBar;
