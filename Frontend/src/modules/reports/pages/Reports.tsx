import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Award, BarChart3, BookOpen, Briefcase, CalendarCheck, CalendarClock,
  ClipboardList, FileCheck, FileText, GraduationCap, LogIn, Receipt, Search, ScrollText, Shield,
  ShoppingCart, TrendingUp, Trophy, UserCheck, UserPlus, Users, type LucideIcon,
} from 'lucide-react';
import { useReportDefinitions } from '@/hooks/useReport';

/**
 * Reports — the hub every role lands on from the sidebar's "Reports" link.
 *
 * Surfaces all 18 mandated report categories (Student/Parent/Teacher/Staff/
 * Principal/Attendance/Enrollment/Course/Assessment/Examination/Certificate/
 * Event/Learning Progress/Performance/Financial/Audit/Activity/Custom) by
 * grouping the single `GET /reports` menu payload — exactly what the backend's
 * `IReportService` already filtered for this user's role/school. There is no
 * client-side RBAC list to keep in sync: whatever categories/reports this
 * account can see is whatever the server returned, so Admin sees all 18 while
 * a Parent or Student sees only the handful scoped to their own data.
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Student Reports': GraduationCap,
  'Parent Reports': Users,
  'Teacher Reports': UserCheck,
  'Staff Reports': Briefcase,
  'Principal Reports': Shield,
  'Attendance Reports': CalendarCheck,
  'Enrollment Reports': UserPlus,
  'Course Reports': BookOpen,
  'Assessment Reports': ClipboardList,
  'Examination Reports': FileCheck,
  'Certificate Reports': Award,
  'Event Reports': CalendarClock,
  'Learning Progress Reports': TrendingUp,
  'Performance Reports': Trophy,
  'Financial Reports': Receipt,
  'Audit Reports': ScrollText,
  'Activity Reports': LogIn,
  'Custom Reports': ShoppingCart,
};

const CATEGORY_COLORS: { bg: string; text: string; border: string }[] = [
  { bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'group-hover:border-indigo-500/30' },
  { bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'group-hover:border-emerald-500/30' },
  { bg: 'bg-violet-50/60 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'group-hover:border-violet-500/30' },
  { bg: 'bg-cyan-50/60 dark:bg-cyan-950/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'group-hover:border-cyan-500/30' },
  { bg: 'bg-amber-50/60 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'group-hover:border-amber-500/30' },
  { bg: 'bg-rose-50/60 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'group-hover:border-rose-500/30' },
];

const Reports: React.FC = () => {
  const { byCategory, isLoading, error, reports } = useReportDefinitions();
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const term = search.trim().toLowerCase();
    const entries = Array.from(byCategory.entries());
    if (!term) return entries;
    return entries
      .map(([category, items]) => [
        category,
        items.filter((r) => r.title.toLowerCase().includes(term) || r.description?.toLowerCase().includes(term) || category.toLowerCase().includes(term)),
      ] as const)
      .filter(([, items]) => items.length > 0);
  }, [byCategory, search]);

  const isFiltering = search.trim().length > 0;
  const matchedReportCount = useMemo(() => categories.reduce((sum, [, items]) => sum + items.length, 0), [categories]);
  const matchedCategoryCount = categories.length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white via-slate-50/50 to-slate-100/30 dark:from-[#1e293b] dark:via-[#1e293b]/90 dark:to-[#0f172a]/40 border border-slate-200/80 dark:border-[#334155] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center shrink-0 shadow-inner">
            <BarChart3 className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Analytics Hub</div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Reporting Center</h1>
            <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1">
              {reports.length === 0
                ? 'Browse the reports available to your role — filters, charts and exports are built into every one.'
                : isFiltering
                  ? `${matchedReportCount} report${matchedReportCount === 1 ? '' : 's'} across ${matchedCategoryCount} categor${matchedCategoryCount === 1 ? 'y' : 'ies'} matching "${search.trim()}"`
                  : `${reports.length} report${reports.length === 1 ? '' : 's'} across ${byCategory.size} categor${byCategory.size === 1 ? 'y' : 'ies'} available to your role`}
            </p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports or categories…"
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0f172a]/55 text-slate-700 dark:text-[#e2e8f0] placeholder:text-slate-400 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 flex items-center gap-3 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-[#1e293b] animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl p-12 text-center shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-700 dark:text-[#cbd5e1]">No reports match your search.</p>
          <p className="text-xs text-slate-400 mt-1">Try a different keyword, or clear the search to see everything available to your role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(([category, items], idx) => {
            const Icon = CATEGORY_ICONS[category] ?? BarChart3;
            const palette = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            return (
              <div key={category} className="group bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-3xl p-5 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${palette.bg}`}>
                    <Icon className={`w-5 h-5 ${palette.text}`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-[#f1f5f9] tracking-tight">{category}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                      {items.length} report{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((report) => (
                    <Link
                      key={report.key}
                      to={`/reports/${report.key}`}
                      className={`group/item flex flex-col gap-0.5 px-3 py-2.5 rounded-2xl border border-slate-100/50 dark:border-[#283548]/40 hover:bg-slate-50 dark:hover:bg-[#283548]/40 transition-all ${palette.border}`}
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0] group-hover/item:text-primary transition-colors">{report.title}</span>
                      {report.description && (
                        <span className="text-[10px] text-slate-400 dark:text-[#64748b] leading-relaxed line-clamp-2 mt-0.5">{report.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reports;
