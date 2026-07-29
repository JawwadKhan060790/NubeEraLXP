import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2,
  Circle, XCircle, Loader2, RefreshCw, PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  teacherEnhancedService,
  type DailySchedule,
  type WeeklySchedule,
  type CalendarEvent,
  type SchedulePeriod,
} from '../../../services/teacherEnhancedService';

// ── Types & helpers ───────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week' | 'month';

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string; icon: React.ElementType }> = {
  NotStarted: { bg: 'bg-violet-50/50 dark:bg-violet-500/15', border: 'border-violet-100 dark:border-violet-400/25', text: 'text-violet-700 dark:text-violet-300',  label: 'Not Started', icon: Circle       },
  InProgress: { bg: 'bg-amber-50/50 dark:bg-amber-500/15',  border: 'border-amber-100 dark:border-amber-400/25',  text: 'text-amber-700 dark:text-amber-300',  label: 'In Progress', icon: PlayCircle   },
  Completed:  { bg: 'bg-emerald-50/50 dark:bg-emerald-500/15',border: 'border-emerald-100 dark:border-emerald-400/25',text: 'text-emerald-700 dark:text-emerald-300',label: 'Completed',   icon: CheckCircle2 },
  Missed:     { bg: 'bg-rose-50/50 dark:bg-rose-500/15',   border: 'border-rose-100 dark:border-rose-400/25',   text: 'text-rose-700 dark:text-rose-300',   label: 'Missed',      icon: XCircle      },
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const getWeekMonday = (d: Date) => {
  const day  = new Date(d);
  const diff = (7 + (day.getDay() - 1)) % 7;
  day.setDate(day.getDate() - diff);
  return day;
};

// ── Period Card ───────────────────────────────────────────────────────────────

const PeriodCard: React.FC<{
  period: SchedulePeriod;
  onMarkStatus: (schedulerId: string, date: string, status: string, period: SchedulePeriod) => void;
  updating: boolean;
}> = ({ period, onMarkStatus, updating }) => {
  const navigate = useNavigate();
  const style = STATUS_STYLE[period.status] ?? STATUS_STYLE.NotStarted;
  const Icon  = style.icon;

  return (
    <div className={`bg-white dark:bg-[#1e293b] border ${style.border} rounded-2xl p-5 hover:shadow-md transition-all space-y-3 shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
              <Icon size={10} />
              {style.label}
            </span>
          </div>
          <p className="font-bold text-slate-800 dark:text-white text-sm leading-snug">
            {period.grade_name}{period.section_name ? ` - ${period.section_name}` : ''}
          </p>
          {period.module_name && <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold">{period.module_name}</p>}
          {period.lesson_name && <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-medium truncate max-w-[180px]">{period.lesson_name}</p>}
        </div>
        <div className="text-right shrink-0 bg-slate-50 dark:bg-[#283548] border border-slate-100 dark:border-[#334155] rounded-lg p-1.5 min-w-[70px]">
          <p className="text-[11px] font-bold font-mono text-slate-700 dark:text-[#e2e8f0]">{fmtTime(period.start_time)}</p>
          <p className="text-[9px] text-slate-400 dark:text-[#64748b] font-bold">→ {fmtTime(period.end_time)}</p>
        </div>
      </div>

      {period.remarks && (
        <p className="text-[11px] text-slate-500 dark:text-[#94a3b8] italic bg-slate-50/50 dark:bg-[#283548]/50 p-2 rounded-lg border border-slate-100/50 dark:border-[#334155]/50">"{period.remarks}"</p>
      )}

      {period.actual_start_time && (
        <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-bold flex flex-col gap-0.5 bg-slate-50 dark:bg-[#283548] p-2 rounded-lg border border-slate-100 dark:border-[#334155]">
          <div className="flex justify-between">
            <span>Actual Start:</span>
            <span className="font-mono">{new Date(period.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {period.actual_end_time && (
            <div className="flex justify-between border-t border-slate-200/50 dark:border-[#334155] pt-0.5 mt-0.5">
              <span>Actual End:</span>
              <span className="font-mono">{new Date(period.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      )}

      {period.status === 'NotStarted' && (
        <button
          onClick={() => onMarkStatus(period.scheduler_id, period.period_date, 'InProgress', period)}
          disabled={updating}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {updating ? <Loader2 size={12} className="inline animate-spin mr-1.5" /> : null}
          ▶ Start Period
        </button>
      )}

      {period.status === 'InProgress' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/teacher/attendance?gradeId=${period.grade_id}&sectionId=${period.section_id || ''}&date=${period.period_date}&schedulerId=${period.scheduler_id}&moduleId=${period.module_id || ''}&lessonId=${period.lesson_id || ''}`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            ✏ Take Attendance
          </button>
          <button
            onClick={() => onMarkStatus(period.scheduler_id, period.period_date, 'Completed', period)}
            disabled={updating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {updating ? <Loader2 size={12} className="inline animate-spin mr-1.5" /> : null}
            🛑 End Period
          </button>
        </div>
      )}

      {period.status === 'Completed' && (
        <button
          onClick={() => navigate(`/teacher/learning-path?gradeId=${period.grade_id}&moduleId=${period.module_id || ''}&lessonId=${period.lesson_id || ''}`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          ✓ View Lesson Path
        </button>
      )}
    </div>
  );
};

// ── Day View ──────────────────────────────────────────────────────────────────

const DayView: React.FC<{
  schedule: DailySchedule;
  onMarkStatus: (schedulerId: string, date: string, status: string, period: SchedulePeriod) => void;
  updatingId: string | null;
}> = ({ schedule, onMarkStatus, updatingId }) => (
  <div className="space-y-4">
    {/* Summary bar */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: 'Total Periods', val: schedule.total,     color: 'text-slate-800 dark:text-white',   iconColor: 'text-slate-500 dark:text-[#94a3b8]',   border: 'border-slate-200 dark:border-[#334155]',   bg: 'bg-white dark:bg-[#1e293b]',           icon: Calendar     },
        { label: 'Completed',     val: schedule.completed, color: 'text-emerald-700 dark:text-emerald-300', iconColor: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-400/25', bg: 'bg-emerald-50/40 dark:bg-emerald-500/15',   icon: CheckCircle2 },
        { label: 'Pending',       val: schedule.pending,   color: 'text-amber-700 dark:text-amber-300',   iconColor: 'text-amber-500 dark:text-amber-400',   border: 'border-amber-100 dark:border-amber-400/25',   bg: 'bg-amber-50/40 dark:bg-amber-500/15',     icon: Clock        },
        { label: 'Missed',        val: schedule.missed,    color: 'text-rose-700 dark:text-rose-300',    iconColor: 'text-rose-500 dark:text-rose-400',    border: 'border-rose-100 dark:border-rose-400/25',    bg: 'bg-rose-50/40 dark:bg-rose-500/15',      icon: XCircle      },
      ].map(({ label, val, color, iconColor, border, bg, icon: Icon }) => (
        <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 flex items-center gap-3 shadow-sm transition-all hover:scale-[1.02]`}>
          <div className={`p-2.5 rounded-xl bg-white dark:bg-[#1e293b] shadow-sm border ${border} shrink-0`}>
            <Icon size={18} className={iconColor} />
          </div>
          <div>
            <p className={`text-2xl font-extrabold tracking-tight leading-none ${color}`}>{val}</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-widest mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>

    {schedule.periods.length === 0 ? (
      <div className="text-center py-16 bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm text-slate-400 dark:text-[#64748b]">
        <Calendar size={48} className="mx-auto mb-3 opacity-30 text-slate-400 dark:text-[#64748b]" />
        <p className="text-sm font-bold">No periods scheduled for this day.</p>
      </div>
    ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.periods.map(p => (
          <PeriodCard
            key={p.id || p.scheduler_id}
            period={p}
            onMarkStatus={onMarkStatus}
            updating={updatingId === p.scheduler_id}
          />
        ))}
      </div>
    )}
  </div>
);

// ── Week View ─────────────────────────────────────────────────────────────────

const WeekView: React.FC<{
  weekly: WeeklySchedule;
  onMarkStatus: (schedulerId: string, date: string, status: string, period: SchedulePeriod) => void;
  updatingId: string | null;
}> = ({ weekly, onMarkStatus, updatingId }) => (
  <div className="space-y-4">
    {weekly.days.map(day => (
      <div key={day.date} className="bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
        <div className="bg-slate-50/80 dark:bg-[#283548]/80 border-b border-slate-100 dark:border-[#334155] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{day.day_name} — {fmtDate(day.date)}</span>
          <div className="flex gap-3 text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-400/25">{day.completed} done</span>
            <span className="text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-400/25">{day.pending} pending</span>
            {day.missed > 0 && <span className="text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-400/25">{day.missed} missed</span>}
          </div>
        </div>
        {day.periods.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-[#64748b] text-center py-6 font-semibold">No periods scheduled.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {day.periods.map(p => (
              <PeriodCard
                key={p.id || p.scheduler_id}
                period={p}
                onMarkStatus={onMarkStatus}
                updating={updatingId === p.scheduler_id}
              />
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
);

// ── Month View ────────────────────────────────────────────────────────────────

const MonthView: React.FC<{ events: CalendarEvent[]; year: number; month: number }> = ({
  events, year, month,
}) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay  = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const days: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];

  const eventsByDay = events.reduce<Record<number, CalendarEvent[]>>((acc, ev) => {
    const d = new Date(ev.start).getDate();
    acc[d] = acc[d] ? [...acc[d], ev] : [ev];
    return acc;
  }, {});

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-7 mb-1 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-xs font-bold text-slate-400 dark:text-[#64748b] text-center py-2 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, idx) => {
          const evs = d ? (eventsByDay[d] ?? []) : [];
          const isToday = d === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
          return (
            <div
              key={idx}
              className={`min-h-[85px] p-2 rounded-xl border text-xs transition-all
                ${d ? 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-slate-300 shadow-sm' : 'border-transparent bg-transparent'}
                ${isToday ? 'ring-2 ring-primary bg-violet-50/20 dark:bg-violet-500/10' : ''}`}
            >
              {d && (
                <>
                  <p className={`text-[11px] font-bold mb-1.5 ${isToday ? 'text-primary' : 'text-slate-500 dark:text-[#94a3b8]'}`}>{d}</p>
                  {evs.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md mb-1 truncate font-bold shadow-2xs border"
                      style={{ backgroundColor: ev.color + '18', color: ev.color, borderColor: ev.color + '33' }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <p className="text-slate-400 dark:text-[#64748b] text-[10px] font-semibold pl-1">+{evs.length - 3} more</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
        {Object.entries(STATUS_STYLE).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#283548] border border-slate-100 dark:border-[#334155] px-2.5 py-1 rounded-full shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${v.bg} border ${v.border}`} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const TeacherScheduleCalendar: React.FC = () => {
  const [view, setView]            = useState<ViewMode>('day');
  const [currentDate, setDate]     = useState(new Date());
  const [daily, setDaily]          = useState<DailySchedule | null>(null);
  const [weekly, setWeekly]        = useState<WeeklySchedule | null>(null);
  const [monthEvents, setMonthEvts]= useState<CalendarEvent[]>([]);
  const [loading, setLoading]      = useState(false);
  const [updatingId, setUpdating]  = useState<string | null>(null);

  const navigate = useNavigate();

  const toLocalDateStr = (d: Date): string => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadDay = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const iso = toLocalDateStr(d);
      const data = await teacherEnhancedService.getDailySchedule(iso);
      setDaily(data);
    } catch { toast.error('Failed to load daily schedule.'); }
    finally  { setLoading(false); }
  }, []);

  const loadWeek = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const monday = getWeekMonday(d);
      const iso    = toLocalDateStr(monday);
      const data   = await teacherEnhancedService.getWeeklySchedule(iso);
      setWeekly(data);
    } catch { toast.error('Failed to load weekly schedule.'); }
    finally  { setLoading(false); }
  }, []);

  const loadMonth = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const data = await teacherEnhancedService.getMonthlyCalendar(d.getFullYear(), d.getMonth() + 1);
      setMonthEvts(data);
    } catch {
      // Show empty calendar on failure rather than blocking the view
      setMonthEvts([]);
    }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    if (view === 'day')   loadDay(currentDate);
    if (view === 'week')  loadWeek(currentDate);
    if (view === 'month') loadMonth(currentDate);
  }, [view, currentDate, loadDay, loadWeek, loadMonth]);

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    setDate(d);
  };

  const handleMarkStatus = async (schedulerId: string, date: string, status: string, period: SchedulePeriod) => {
    setUpdating(schedulerId);
    try {
      await teacherEnhancedService.updatePeriodStatus(schedulerId, date, { status });
      
      if (status === 'InProgress') {
        toast.success(`Period started.`);
        // Redirect directly to the student attendance page
        navigate(`/teacher/attendance?gradeId=${period.grade_id}&sectionId=${period.section_id || ''}&date=${period.period_date}&schedulerId=${period.scheduler_id}&moduleId=${period.module_id || ''}&lessonId=${period.lesson_id || ''}`);
      } else {
        toast.success(`Period status updated to ${status}.`);
        if (view === 'day') loadDay(currentDate);
        if (view === 'week') loadWeek(currentDate);
        if (view === 'month') loadMonth(currentDate);
      }
    } catch { toast.error('Failed to update period status.'); }
    finally  { setUpdating(null); }
  };

  const dateLabel =
    view === 'day'   ? fmtDate(currentDate) :
    view === 'week'  ? `Week of ${fmtDate(getWeekMonday(currentDate))}` :
    currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 mx-auto px-1 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Schedule & Periods</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Manage and track your teaching periods
          </p>
        </div>
        <button
          onClick={() => {
            const t = toast.loading('Syncing today\'s periods...');
            teacherEnhancedService.seedTodayPeriods()
              .then(() => {
                toast.success('Today\'s periods refreshed.', { id: t });
                if (view === 'day') loadDay(currentDate);
              })
              .catch(() => toast.error('Failed to sync periods.', { id: t }));
          }}
          className="bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-[#e2e8f0] px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 dark:border-[#334155] shadow-sm cursor-pointer"
        >
          <RefreshCw size={12} className="animate-spin" /> Sync Today
        </button>
      </div>

      {/* View toggle + navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-[#283548] p-1 rounded-lg border border-slate-200/50 dark:border-[#334155] self-start">
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-md transition-all capitalize cursor-pointer font-bold text-[10px] uppercase tracking-widest
                ${view === v
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#334155]/50'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 bg-white dark:bg-[#1e293b] px-4 py-2 rounded-lg border border-slate-200 dark:border-[#334155] shadow-sm">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-[#283548] border border-slate-100 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-[#e2e8f0] min-w-[150px] text-center">{dateLabel}</span>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-[#283548] border border-slate-100 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            <ChevronRight size={14} />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-[#334155] mx-1" />
          <button onClick={() => setDate(new Date())} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] transition-colors cursor-pointer">
            Today
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {view === 'day'   && daily  && <DayView   schedule={daily}  onMarkStatus={handleMarkStatus} updatingId={updatingId} />}
          {view === 'week'  && weekly && <WeekView  weekly={weekly}   onMarkStatus={handleMarkStatus} updatingId={updatingId} />}
          {view === 'month' && (
            <MonthView events={monthEvents} year={currentDate.getFullYear()} month={currentDate.getMonth() + 1} />
          )}
        </>
      )}
    </div>
  );
};

export default TeacherScheduleCalendar;
