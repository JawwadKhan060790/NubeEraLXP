import { TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatItem {
  title: string;
  /** Numeric value triggers count-up animation; strings render as-is */
  value: number | string;
  icon: React.ReactNode;
  color?: keyof typeof palette;
  subtitle?: string;
  trend?: { value: number; label: string };
}

// ─── Palette ──────────────────────────────────────────────────────────────────
// card:     white base + very faint color gradient toward bottom-right
// border:   ultra-light tint of the color
// iconBg:   soft pastel bubble
// iconText: mid-tone icon color
// label:    same hue, slightly darker for readability

const palette = {
  sky: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #e0f2fe28 100%)',
    border:    '#bae6fd',          // sky-200
    iconBg:    '#e0f2fe',          // sky-100
    iconText:  '#0ea5e9',          // sky-500
    label:     '#0284c7',          // sky-600
    shadow:    'rgba(14,165,233,0.09)',
  },
  violet: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #ede9fe28 100%)',
    border:    '#ddd6fe',          // violet-200
    iconBg:    '#ede9fe',          // violet-100
    iconText:  '#7c3aed',          // violet-600
    label:     '#7c3aed',
    shadow:    'rgba(124,58,237,0.09)',
  },
  emerald: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #d1fae528 100%)',
    border:    '#a7f3d0',          // emerald-200
    iconBg:    '#d1fae5',          // emerald-100
    iconText:  '#059669',          // emerald-600
    label:     '#059669',
    shadow:    'rgba(5,150,105,0.09)',
  },
  amber: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #fef3c728 100%)',
    border:    '#fde68a',          // amber-200
    iconBg:    '#fef3c7',          // amber-100
    iconText:  '#d97706',          // amber-600
    label:     '#d97706',
    shadow:    'rgba(217,119,6,0.09)',
  },
  rose: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #ffe4e628 100%)',
    border:    '#fecdd3',          // rose-200
    iconBg:    '#ffe4e6',          // rose-100
    iconText:  '#f43f5e',          // rose-500
    label:     '#e11d48',          // rose-600
    shadow:    'rgba(244,63,94,0.09)',
  },
  indigo: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #e0e7ff28 100%)',
    border:    '#c7d2fe',          // indigo-200
    iconBg:    '#e0e7ff',          // indigo-100
    iconText:  '#4f46e5',          // indigo-600
    label:     '#4f46e5',
    shadow:    'rgba(79,70,229,0.09)',
  },
  teal: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #ccfbf128 100%)',
    border:    '#99f6e4',          // teal-200
    iconBg:    '#ccfbf1',          // teal-100
    iconText:  '#0d9488',          // teal-600
    label:     '#0d9488',
    shadow:    'rgba(13,148,136,0.09)',
  },
  purple: {
    gradient:  'linear-gradient(135deg, #ffffff 100%, #f3e8ff28 100%)',
    border:    '#e9d5ff',          // purple-200
    iconBg:    '#f3e8ff',          // purple-100
    iconText:  '#9333ea',          // purple-600
    label:     '#9333ea',
    shadow:    'rgba(147,51,234,0.09)',
  },
} as const;

const defaultColors = Object.keys(palette) as (keyof typeof palette)[];

// ─── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef   = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const pct  = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(ease * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ─── Single stat card ─────────────────────────────────────────────────────────

const StatCard: React.FC<StatItem & { colorKey: keyof typeof palette }> = ({
  title, value, icon, colorKey, subtitle, trend,
}) => {
  const c     = palette[colorKey];
  const isNum = typeof value === 'number';
  const count = useCountUp(isNum ? (value as number) : 0);

  return (
    <div
      className="flex items-center justify-between rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background:   c.gradient,
        borderColor:  c.border,
        boxShadow:    `0 1px 4px ${c.shadow}, 0 0 0 0 transparent`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 6px 20px ${c.shadow}, 0 1px 4px ${c.shadow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 1px 4px ${c.shadow}, 0 0 0 0 transparent`;
      }}
    >
      {/* ── Left: label + value + extras ─────────────────────────────── */}
      <div className="flex flex-col gap-1 min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-widest truncate"
          style={{ color: c.label }}
        >
          {title}
        </p>

        <p className="text-3xl font-black text-slate-800 leading-none tracking-tight">
          {isNum ? count.toLocaleString() : value}
        </p>

        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>
        )}

        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.value >= 0
              ? <TrendingUp   className="w-3 h-3 text-emerald-500" />
              : <TrendingDown className="w-3 h-3 text-rose-400" />
            }
            <span className={`text-[10px] font-bold ${trend.value >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: icon bubble ────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 ml-4 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: c.iconBg, color: c.iconText }}
      >
        <span className="w-6 h-6 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </span>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export const SkeletonStatGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm animate-pulse"
      >
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-7 w-16 rounded-lg bg-slate-100" />
          <div className="h-2 w-20 rounded bg-slate-50" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0 ml-4" />
      </div>
    ))}
  </>
);

// ─── StatGrid ─────────────────────────────────────────────────────────────────
/**
 * Drop-in stats grid — renders inside whatever grid container wraps it.
 *
 * ```tsx
 * <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 *   <StatGrid stats={[...]} loading={loading} />
 * </div>
 * ```
 */
const StatGrid: React.FC<{ stats: StatItem[]; loading?: boolean }> = ({
  stats,
  loading = false,
}) => {
  if (loading) return <SkeletonStatGrid count={stats.length || 4} />;

  return (
    <>
      {stats.map((item, i) => (
        <StatCard
          key={i}
          {...item}
          colorKey={item.color ?? defaultColors[i % defaultColors.length]}
        />
      ))}
    </>
  );
};

export default StatGrid;
