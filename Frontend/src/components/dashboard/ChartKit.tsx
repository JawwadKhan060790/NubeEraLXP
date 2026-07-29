/**
 * ChartKit.tsx — Reusable Recharts wrappers for analytics dashboards.
 *
 * Exports:
 *   DashboardAreaChart   — time-series area chart (single series)
 *   DashboardDualChart   — dual-series area chart (two lines / areas)
 *   DashboardBarChart    — horizontal or vertical bar chart
 *   DashboardPieChart    — donut pie chart with legend
 *   DashboardLineChart   — simple line chart
 *   SkeletonChart        — loading shimmer placeholder
 *   ChartEmptyState      — empty-data placeholder
 */

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart,  Bar,
  LineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';

// ── Shared palette ─────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#f97316', // orange
  '#ef4444', // rose
  '#06b6d4', // cyan
];

// ── Shared tooltip style ───────────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#f1f5f9',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
};

const tooltipLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '11px',
  marginBottom: 4,
  fontWeight: 600,
};

// ── Common axis / grid props ───────────────────────────────────────────────────

const axisStyle = { fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' };
const gridProps = { strokeDasharray: '3 3', stroke: '#e2e8f0', strokeOpacity: 0.6 };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TrendPoint { Month: string; Value: number }
export interface DualTrendPoint { Month: string; Primary: number; Secondary: number }
export interface ChartPoint  { Label: string; Value: number }

// ── SkeletonChart ──────────────────────────────────────────────────────────────

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 220 }) => (
  <div
    className="animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-[#283548] dark:via-[#1e293b] dark:to-[#283548]"
    style={{ height }}
  />
);

// ── ChartEmptyState ────────────────────────────────────────────────────────────

export const ChartEmptyState: React.FC<{ message?: string; height?: number }> = ({
  message = 'No data available yet.',
  height = 220,
}) => (
  <div
    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50/60 dark:bg-[#1e293b]/60 border border-slate-100 dark:border-[#334155]"
    style={{ height }}
  >
    <svg className="w-10 h-10 text-slate-200 dark:text-[#334155]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 3v18h18M7 16l4-4 4 4 4-6" />
    </svg>
    <p className="text-xs text-slate-400 dark:text-[#64748b] font-medium">{message}</p>
  </div>
);

// ── DashboardAreaChart ─────────────────────────────────────────────────────────

interface AreaChartProps {
  data: TrendPoint[];
  color?: string;
  height?: number;
  loading?: boolean;
  yLabel?: string;
  suffix?: string;
}

export const DashboardAreaChart: React.FC<AreaChartProps> = ({
  data,
  color = CHART_COLORS[0],
  height = 220,
  loading = false,
  suffix = '',
}) => {
  if (loading) return <SkeletonChart height={height} />;
  const hasData = data.some(d => d.Value > 0);
  if (!hasData) return <ChartEmptyState height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`ag-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="Month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={((v: any) => [`${v}${suffix}`, 'Value']) as any}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2' }}
        />
        <Area
          type="monotone"
          dataKey="Value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#ag-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ── DashboardDualChart ─────────────────────────────────────────────────────────

interface DualChartProps {
  data: DualTrendPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  loading?: boolean;
  suffix?: string;
}

export const DashboardDualChart: React.FC<DualChartProps> = ({
  data,
  primaryLabel   = 'Current',
  secondaryLabel = 'Previous',
  primaryColor   = CHART_COLORS[0],
  secondaryColor = CHART_COLORS[1],
  height = 220,
  loading = false,
  suffix = '',
}) => {
  if (loading) return <SkeletonChart height={height} />;
  const hasData = data.some(d => d.Primary > 0 || d.Secondary > 0);
  if (!hasData) return <ChartEmptyState height={height} />;

  const pid = `dp-${primaryColor.replace('#', '')}`;
  const sid = `ds-${secondaryColor.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={pid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={primaryColor}   stopOpacity={0.18} />
            <stop offset="95%" stopColor={primaryColor}   stopOpacity={0} />
          </linearGradient>
          <linearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={secondaryColor} stopOpacity={0.14} />
            <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="Month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={((v: any, name: any) => [`${v}${suffix}`, name]) as any}
          cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 2' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 6 }}
        />
        <Area
          type="monotone"
          dataKey="Primary"
          name={primaryLabel}
          stroke={primaryColor}
          strokeWidth={2.5}
          fill={`url(#${pid})`}
          dot={false}
          activeDot={{ r: 5, fill: primaryColor, strokeWidth: 2, stroke: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="Secondary"
          name={secondaryLabel}
          stroke={secondaryColor}
          strokeWidth={2}
          strokeDasharray="4 2"
          fill={`url(#${sid})`}
          dot={false}
          activeDot={{ r: 4, fill: secondaryColor, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ── DashboardBarChart ──────────────────────────────────────────────────────────

interface BarChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
  loading?: boolean;
  layout?: 'vertical' | 'horizontal';
  suffix?: string;
  colorful?: boolean;
}

export const DashboardBarChart: React.FC<BarChartProps> = ({
  data,
  color = CHART_COLORS[0],
  height = 220,
  loading = false,
  layout = 'vertical',
  suffix = '',
  colorful = false,
}) => {
  if (loading) return <SkeletonChart height={height} />;
  if (!data.length) return <ChartEmptyState height={height} />;

  const isHoriz = layout === 'horizontal';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={isHoriz ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 8, left: isHoriz ? 60 : -20, bottom: 0 }}
      >
        <CartesianGrid {...gridProps} horizontal={!isHoriz} vertical={isHoriz} />
        {isHoriz ? (
          <>
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="Label"
              tick={{ ...axisStyle, textAnchor: 'end' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="Label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          </>
        )}
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={((v: any) => [`${v}${suffix}`, 'Value']) as any}
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
        />
        <Bar
          dataKey="Value"
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        >
          {colorful && data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── DashboardLineChart ─────────────────────────────────────────────────────────

interface LineChartProps {
  data: TrendPoint[];
  color?: string;
  height?: number;
  loading?: boolean;
  suffix?: string;
}

export const DashboardLineChart: React.FC<LineChartProps> = ({
  data,
  color = CHART_COLORS[0],
  height = 220,
  loading = false,
  suffix = '',
}) => {
  if (loading) return <SkeletonChart height={height} />;
  const hasData = data.some(d => d.Value > 0);
  if (!hasData) return <ChartEmptyState height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="Month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={((v: any) => [`${v}${suffix}`, 'Value']) as any}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2' }}
        />
        <Line
          type="monotone"
          dataKey="Value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ── DashboardPieChart ──────────────────────────────────────────────────────────

interface PieChartProps {
  data: ChartPoint[];
  height?: number;
  loading?: boolean;
  innerRadius?: number;
  colors?: string[];
}

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const DashboardPieChart: React.FC<PieChartProps> = ({
  data,
  height = 220,
  loading = false,
  innerRadius = 52,
  colors = CHART_COLORS,
}) => {
  if (loading) return <SkeletonChart height={height} />;
  const hasData = data.some(d => d.Value > 0);
  if (!hasData) return <ChartEmptyState height={height} />;

  return (
    <div style={{ height }} className="flex items-center gap-4">
      {/* Donut */}
      <div style={{ flex: '0 0 auto', width: height * 0.9, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="Value"
              nameKey="Label"
              cx="50%"
              cy="50%"
              outerRadius={height * 0.38}
              innerRadius={innerRadius}
              paddingAngle={2}
              labelLine={false}
              label={renderCustomLabel as any}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={((v: any, name: any) => [v.toLocaleString(), name]) as any}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <ul className="flex flex-col gap-1.5 min-w-0 flex-1">
        {data.map((item, i) => {
          const total = data.reduce((s, d) => s + d.Value, 0);
          const pct   = total > 0 ? Math.round(item.Value / total * 100) : 0;
          return (
            <li key={i} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span
                className="text-[11px] text-slate-600 dark:text-[#cbd5e1] font-medium flex-1 break-words leading-tight"
                title={item.Label}
              >
                {item.Label}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-[#64748b] tabular-nums shrink-0">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
