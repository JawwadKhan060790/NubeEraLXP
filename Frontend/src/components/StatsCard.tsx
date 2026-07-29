import { TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface StatsCardProps {
  title: string;
  /** Numbers trigger count-up animation; pre-formatted strings (e.g. "45%", "$1,234") render as-is. */
  value: number | string;
  icon?: React.ReactNode;
  /** One of the named color keys below */
  color?: keyof typeof colorConfig;
  /** Legacy prop — mapped to the nearest color key */
  colorClass?: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  /** Show skeleton shimmer (while loading) */
  loading?: boolean;
}

// ─── Color system ─────────────────────────────────────────────────────────────
const colorConfig = {
  indigo: {
    cardGradient: 'from-indigo-50/40 via-white to-white',
    iconBg:       'bg-indigo-100',
    iconText:     'text-indigo-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(79,70,229,0.12)]',
    labelColor:   'text-indigo-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(79,70,229,0.12)]',
    orb:          'bg-indigo-100/70',
  },
  violet: {
    cardGradient: 'from-violet-50/40 via-white to-white',
    iconBg:       'bg-violet-100',
    iconText:     'text-violet-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(124,58,237,0.12)]',
    labelColor:   'text-violet-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(124,58,237,0.12)]',
    orb:          'bg-violet-100/70',
  },
  blue: {
    cardGradient: 'from-blue-50/40 via-white to-white',
    iconBg:       'bg-blue-100',
    iconText:     'text-blue-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(37,99,235,0.12)]',
    labelColor:   'text-blue-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(37,99,235,0.12)]',
    orb:          'bg-blue-100/70',
  },
  cyan: {
    cardGradient: 'from-cyan-50/40 via-white to-white',
    iconBg:       'bg-cyan-100',
    iconText:     'text-cyan-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(8,145,178,0.12)]',
    labelColor:   'text-cyan-600',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(8,145,178,0.12)]',
    orb:          'bg-cyan-100/70',
  },
  emerald: {
    cardGradient: 'from-emerald-50/40 via-white to-white',
    iconBg:       'bg-emerald-100',
    iconText:     'text-emerald-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(5,150,105,0.12)]',
    labelColor:   'text-emerald-600',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(5,150,105,0.12)]',
    orb:          'bg-emerald-100/70',
  },
  amber: {
    cardGradient: 'from-amber-50/40 via-white to-white',
    iconBg:       'bg-amber-100',
    iconText:     'text-amber-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(217,119,6,0.12)]',
    labelColor:   'text-amber-600',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(217,119,6,0.12)]',
    orb:          'bg-amber-100/70',
  },
  rose: {
    cardGradient: 'from-rose-50/40 via-white to-white',
    iconBg:       'bg-rose-100',
    iconText:     'text-rose-500',
    iconGlow:     'shadow-[0_2px_10px_rgba(225,29,72,0.12)]',
    labelColor:   'text-rose-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(225,29,72,0.12)]',
    orb:          'bg-rose-100/70',
  },
  teal: {
    cardGradient: 'from-teal-50/40 via-white to-white',
    iconBg:       'bg-teal-100',
    iconText:     'text-teal-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(13,148,136,0.12)]',
    labelColor:   'text-teal-600',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(13,148,136,0.12)]',
    orb:          'bg-teal-100/70',
  },
  purple: {
    cardGradient: 'from-purple-50/40 via-white to-white',
    iconBg:       'bg-purple-100',
    iconText:     'text-purple-600',
    iconGlow:     'shadow-[0_2px_10px_rgba(147,51,234,0.12)]',
    labelColor:   'text-purple-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(147,51,234,0.12)]',
    orb:          'bg-purple-100/70',
  },
  slate: {
    cardGradient: 'from-slate-50/60 via-white to-white',
    iconBg:       'bg-slate-100',
    iconText:     'text-slate-500',
    iconGlow:     'shadow-[0_2px_10px_rgba(71,85,105,0.10)]',
    labelColor:   'text-slate-500',
    valueShadow:  '',
    hoverGlow:    'hover:shadow-[0_6px_24px_rgba(71,85,105,0.10)]',
    orb:          'bg-slate-100/80',
  },
} as const;

// ─── Legacy colorClass → color mapping ───────────────────────────────────────
const legacyMap: Record<string, keyof typeof colorConfig> = {
  'bg-primary':     'indigo',
  'bg-brand-500':   'purple',
  'bg-brand-600':   'indigo',
  'bg-brand-400':   'violet',
  'bg-neutral-800': 'slate',
  'bg-rose-500':    'rose',
  'bg-emerald-600': 'emerald',
  'bg-slate-500':   'slate',
  'bg-amber-500':   'amber',
  'bg-blue-500':    'blue',
};

const resolveColor = (
  color?: keyof typeof colorConfig,
  colorClass?: string,
): keyof typeof colorConfig => {
  if (color && color in colorConfig) return color;
  if (colorClass && legacyMap[colorClass]) return legacyMap[colorClass];
  return 'indigo';
};

// ─── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ─── SkeletonStatCard ──────────────────────────────────────────────────────────
export const SkeletonStatCard: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100" />
    </div>
    <div className="h-7 w-20 bg-slate-100 rounded-lg mb-2" />
    <div className="h-3 w-28 bg-slate-100 rounded" />
  </div>
);

// ─── StatsCard ────────────────────────────────────────────────────────────────
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  colorClass,
  subtitle,
  trend,
  loading = false,
}) => {
  const cfg  = colorConfig[resolveColor(color, colorClass)];
  const isNum = typeof value === 'number';
  const animated = useCountUp(isNum ? (value as number) : 0);

  if (loading) return <SkeletonStatCard />;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.cardGradient} border border-slate-100 shadow-sm p-5 transition-all duration-300 ${cfg.hoverGlow} hover:-translate-y-0.5`}>
      {/* decorative orb */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${cfg.orb} blur-2xl pointer-events-none`} />
 <div className="flex items-center justify-between gap-4 relative z-10">
  {/* Left Side - Content */}
  <div className="flex-1 min-w-0">
    <p
      className={`text-xs font-semibold uppercase tracking-widest ${cfg.labelColor}`}
    >
      {title}
    </p>

    <p className="mt-1 text-2xl font-black text-slate-900 leading-none">
      {isNum ? animated : value}
    </p>

    {subtitle && (
      <p className="mt-1 text-[11px] text-slate-400 font-medium truncate">
        {subtitle}
      </p>
    )}

    {trend && (
      <div className="mt-2 flex items-center gap-1">
        {trend.value >= 0 ? (
          <TrendingUp className="w-3 h-3 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3 h-3 text-rose-500" />
        )}

        <span
          className={`text-[10px] font-bold ${
            trend.value >= 0
              ? 'text-emerald-600'
              : 'text-rose-500'
          }`}
        >
          {trend.value >= 0 ? '+' : ''}
          {trend.value}% {trend.label}
        </span>
      </div>
    )}
  </div>

  {/* Right Side - Icon */}
  {icon && (
    <div
      className={`flex-shrink-0 w-12 h-12 rounded-2xl ${cfg.iconBg} ${cfg.iconGlow}
      flex items-center justify-center`}
    >
      <span
        className={`${cfg.iconText} [&>svg]:w-6 [&>svg]:h-6`}
      >
        {icon}
      </span>
    </div>
  )}
</div>
    </div>
  );
};

export default StatsCard;
