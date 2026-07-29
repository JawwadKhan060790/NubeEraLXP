/**
 * DashboardKit — Shared primitives for all role dashboards.
 *
 * Components:
 *  • DashboardPageShell   — outer page wrapper with header area
 *  • WelcomeBanner        — greeting card with role badge
 *  • DashboardWidgetCard  — generic white card container
 *  • DashboardChartCard   — card with standardized chart header
 *  • DashboardTabBar      — pill-style tab navigation
 *  • SectionHeader        — section title row with optional action slot
 *  • SkeletonStatCard     — loading placeholder matching StatsCard dimensions
 *  • StatGrid             — responsive grid wrapper for stat cards
 *  • EmptyState           — zero-data placeholder
 *  • DashboardBadge       — tiny pill label (used in chart headers)
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPageShell
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardPageShellProps {
  children: React.ReactNode;
  /** Extra class appended to the outer wrapper */
  className?: string;
}

export const DashboardPageShell: React.FC<DashboardPageShellProps> = ({
  children,
  className = '',
}) => (
  <div className={`flex flex-col gap-6 p-6 min-h-full ${className}`}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeBanner
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeBannerProps {
  title: string;
  subtitle?: string;
  /** Pill text, e.g. "Admin Panel" or "Staff Portal" */
  badge?: string;
  /** Color of the badge pill: default 'indigo' */
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'teal' | 'violet' | 'blue' | 'slate';
  /** Slot for right-side actions (buttons, selectors, etc.) */
  actions?: React.ReactNode;
}

const badgeCx: Record<string, string> = {
  indigo:  'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-400/25',
  emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25',
  amber:   'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25',
  rose:    'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25',
  teal:    'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-400/25',
  violet:  'bg-violet-50 text-violet-600 border border-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-400/25',
  blue:    'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/25',
  slate:   'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#283548] dark:text-[#cbd5e1] dark:border-[#334155]',
};

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = 'indigo',
  actions,
}) => (
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div className="flex flex-col gap-1.5 min-w-0">
      {badge && (
        <span className={`inline-flex items-center self-start text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${badgeCx[badgeColor]}`}>
          {badge}
        </span>
      )}
      <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] leading-relaxed">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatGrid
// ─────────────────────────────────────────────────────────────────────────────

interface StatGridProps {
  children: React.ReactNode;
  /** Number of columns at the largest breakpoint (default 4) */
  cols?: 2 | 3 | 4 | 5 | 6;
}

const colsCx: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

export const StatGrid: React.FC<StatGridProps> = ({ children, cols = 4 }) => (
  <div className={`grid ${colsCx[cols]} gap-4`}>{children}</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DashboardWidgetCard
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardWidgetCardProps {
  children: React.ReactNode;
  className?: string;
  /** Remove default padding (useful when embedding tables) */
  noPadding?: boolean;
}

export const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  children,
  className = '',
  noPadding = false,
}) => (
  <div
    className={`
      bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155]
      shadow-[0_4px_20px_rgba(15,30,60,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
      ${noPadding ? '' : 'p-6'}
      ${className}
    `}
  >
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DashboardChartCard
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardChartCardProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  /** Color class for the badge pill (default: primary) */
  badgeVariant?: 'primary' | 'emerald' | 'amber' | 'rose' | 'teal' | 'blue' | 'violet';
  children: React.ReactNode;
  className?: string;
  /** Extra items on the right side of the header */
  headerRight?: React.ReactNode;
}

const chartBadgeCx: Record<string, string> = {
  primary: 'text-primary bg-primary/10',
  emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15',
  amber:   'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15',
  rose:    'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/15',
  teal:    'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-500/15',
  blue:    'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/15',
  violet:  'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/15',
};

export const DashboardChartCard: React.FC<DashboardChartCardProps> = ({
  title,
  icon,
  badge,
  badgeVariant = 'primary',
  children,
  className = '',
  headerRight,
}) => (
  <DashboardWidgetCard className={`space-y-5 ${className}`}>
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#283548] pb-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-wide">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${chartBadgeCx[badgeVariant]}`}>
            {badge}
          </span>
        )}
        {headerRight}
      </div>
    </div>
    {children}
  </DashboardWidgetCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// DashboardTabBar
// ─────────────────────────────────────────────────────────────────────────────

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface DashboardTabBarProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  /** Visual style */
  variant?: 'pills' | 'underline';
}

export const DashboardTabBar: React.FC<DashboardTabBarProps> = ({
  tabs,
  active,
  onChange,
  variant = 'pills',
}) => {
  if (variant === 'underline') {
    return (
      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-[#334155] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap border-b-2 -mb-px cursor-pointer ${
              active === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white hover:border-slate-300 dark:hover:border-[#475569]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                active === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-[#283548] text-slate-500 dark:text-[#94a3b8]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#283548] p-1 rounded-xl overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            active === tab.key
              ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              active === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-[#334155] text-slate-500 dark:text-[#94a3b8]'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  /** Optional slot: buttons, dropdowns, filters */
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  actions,
  className = '',
}) => (
  <div className={`flex items-center justify-between gap-4 ${className}`}>
    <div className="flex items-center gap-2">
      {icon && <span className="shrink-0 text-slate-500 dark:text-[#94a3b8]">{icon}</span>}
      <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-wide">{title}</h2>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonStatCard
// ─────────────────────────────────────────────────────────────────────────────

export const SkeletonStatCard: React.FC = () => (
  <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] border-l-4 border-l-slate-200 dark:border-l-[#334155] rounded-2xl p-5 animate-pulse flex items-center justify-between gap-4">
    <div className="flex flex-col gap-2 flex-1">
      <div className="h-2.5 w-20 bg-slate-100 dark:bg-[#283548] rounded-full" />
      <div className="h-7 w-16 bg-slate-100 dark:bg-[#283548] rounded-lg" />
      <div className="h-2 w-24 bg-slate-100 dark:bg-[#283548] rounded-full" />
    </div>
    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#283548] shrink-0" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No data available',
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
    {icon && (
      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-[#283548] flex items-center justify-center text-slate-300 dark:text-[#475569] mb-1">
        {icon}
      </div>
    )}
    <p className="text-sm font-bold text-slate-500 dark:text-[#94a3b8]">{title}</p>
    {description && <p className="text-xs text-slate-400 dark:text-[#64748b] max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DashboardBadge
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'emerald' | 'amber' | 'rose' | 'teal' | 'blue' | 'violet' | 'slate';
}

const dbBadgeCx: Record<string, string> = {
  primary: 'text-primary bg-primary/10',
  emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15',
  amber:   'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15',
  rose:    'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/15',
  teal:    'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-500/15',
  blue:    'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/15',
  violet:  'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/15',
  slate:   'text-slate-600 bg-slate-100 dark:text-[#cbd5e1] dark:bg-[#283548]',
};

export const DashboardBadge: React.FC<DashboardBadgeProps> = ({ children, variant = 'primary' }) => (
  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${dbBadgeCx[variant]}`}>
    {children}
  </span>
);
