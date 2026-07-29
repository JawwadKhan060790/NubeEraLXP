import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import type { ReportChart as ReportChartData } from '../../services/reportService';

export interface ReportChartProps {
  chart: ReportChartData;
}

/** Palette mirrors the Dashboard's chart colors so reports look native, not bolted-on. */
const PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

const axisProps = { stroke: '#94a3b8', fontSize: 10, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl text-xs font-semibold flex flex-col gap-1.5 border border-white/10 dark:border-slate-800">
      {label !== undefined && <div className="text-slate-400 border-b border-white/10 pb-1 font-black tracking-wider">{label}</div>}
      {payload.map((entry: any) => (
        <div key={entry.dataKey ?? entry.name} className="flex items-center justify-between gap-4" style={{ color: entry.color ?? entry.payload?.fill }}>
          <span>{entry.name}:</span>
          <span className="text-white font-black">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * ReportChart — the ONE chart renderer every report's `charts[]` array flows
 * through. It switches purely on the backend's `ReportChartType`
 * (Line/Bar/Pie/Donut/Area) and renders whatever `labels`/`series` the
 * provider computed from the SAME filtered dataset as the grid/KPIs —
 * "All charts must display real database data only. No hardcoded values"
 * is enforced upstream by construction; this component only ever draws what
 * the engine handed it. Multi-series charts (`series.length > 1`) render one
 * line/bar/area per series automatically — no per-report chart code needed.
 */
const ReportChartCard: React.FC<ReportChartProps> = ({ chart }) => {
  if (!chart?.labels?.length || !chart?.series?.length) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#283548] pb-3">
          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-xs font-black text-slate-800 dark:text-[#f1f5f9] tracking-wide">{chart?.title ?? 'Chart'}</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-xs font-semibold text-slate-400">
          No chart data available for the current filters.
        </div>
      </div>
    );
  }

  const data = chart.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    chart.series.forEach((s) => { point[s.name] = s.data[i] ?? 0; });
    return point;
  });

  const seriesColor = (idx: number, explicit?: string | null) => explicit || PALETTE[idx % PALETTE.length];

  let body: React.ReactNode;

  if (chart.type === 'pie' || chart.type === 'donut') {
    const single = chart.series[0];
    const pieData = chart.labels.map((label, i) => ({ name: label, value: single?.data[i] ?? 0 }));
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={chart.type === 'donut' ? 50 : 0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  } else if (chart.type === 'line') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203,213,225,0.15)" vertical={false} />
          <XAxis dataKey="name" {...axisProps} dy={10} />
          <YAxis {...axisProps} dx={-5} />
          <RechartsTooltip content={<ChartTooltip />} />
          {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}
          {chart.series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={seriesColor(i, s.color)} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  } else if (chart.type === 'area') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {chart.series.map((s, i) => (
              <linearGradient key={s.name} id={`grad-${chart.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={seriesColor(i, s.color)} stopOpacity={0.25} />
                <stop offset="95%" stopColor={seriesColor(i, s.color)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203,213,225,0.15)" vertical={false} />
          <XAxis dataKey="name" {...axisProps} dy={10} />
          <YAxis {...axisProps} dx={-5} />
          <RechartsTooltip content={<ChartTooltip />} />
          {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}
          {chart.series.map((s, i) => (
            <Area key={s.name} type="monotone" dataKey={s.name} stroke={seriesColor(i, s.color)} strokeWidth={2.5}
              fillOpacity={1} fill={`url(#grad-${chart.key}-${i})`} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  } else {
    // Bar (default)
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203,213,225,0.15)" vertical={false} />
          <XAxis dataKey="name" {...axisProps} dy={10} />
          <YAxis {...axisProps} dx={-5} />
          <RechartsTooltip content={<ChartTooltip />} />
          {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}
          {chart.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={seriesColor(i, s.color)} radius={[6, 6, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/5 dark:from-[#1e293b] dark:to-[#0f172a]/60 border border-slate-200 dark:border-[#334155] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#283548]/40 pb-3">
        <BarChart3 className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-xs font-black text-slate-800 dark:text-[#f1f5f9] tracking-wide">{chart.title}</h3>
        {chart.value_label && <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">{chart.value_label}</span>}
      </div>
      <div className="h-64">{body}</div>
    </div>
  );
};

export default ReportChartCard;
