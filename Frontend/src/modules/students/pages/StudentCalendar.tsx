import api from '@/services/api';
import { studentCalendarService, type StudentCalendarEvent } from '@/services/studentCalendarService';
import {
  Award,
  BookOpen,
  CalendarDays,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  Info,
  Loader2,
  MapPin,
  Users
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'month';

interface StudentCalendarProps {
  studentId?: string;
}

const TYPE_STYLES = {
  Class: {
    bg: 'bg-blue-50/50 dark:bg-blue-500/15',
    border: 'border-blue-100 dark:border-blue-400/25',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'Class Period',
    icon: Clock,
  },
  Exam: {
    bg: 'bg-amber-50/50 dark:bg-amber-500/15',
    border: 'border-amber-100 dark:border-amber-400/25',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'MCQ Exam',
    icon: Award,
  },
  Event: {
    bg: 'bg-purple-50/50 dark:bg-purple-500/15',
    border: 'border-purple-100 dark:border-purple-400/25',
    text: 'text-purple-700 dark:text-purple-300',
    label: 'School Event',
    icon: CalendarDays,
  },
};

const fmtTime = (t: string) => {
  if (!t) return '';
  // Check if it has time format like HH:MM:SS or is ISO string
  const timePart = t.includes('T') ? t.split('T')[1] : t;
  const parts = timePart.split(':');
  if (parts.length < 2) return t;
  const hour = parseInt(parts[0]);
  const min = parts[1];
  return `${hour > 12 ? hour - 12 : hour || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const StudentCalendar: React.FC<StudentCalendarProps> = ({ studentId }) => {
  const { studentId: routeStudentId } = useParams<{ studentId?: string }>();
  const navigate = useNavigate();
  const resolvedStudentId = studentId || routeStudentId;

  const [activeStudentId, setActiveStudentId] = useState<string | null>(resolvedStudentId || null);
  const [studentInfo, setStudentInfo] = useState<{ fullName: string; gradeName: string } | null>(null);
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setDate] = useState(new Date());
  const [events, setEvents] = useState<StudentCalendarEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<StudentCalendarEvent | null>(null);

  // 1. Resolve student ID if not passed
  useEffect(() => {
    if (!resolvedStudentId) {
      setLoading(true);
      api.get('/dashboard/student')
        .then(res => {
          if (res.data && res.data.id) {
            setActiveStudentId(res.data.id);
            setStudentInfo({
              fullName: res.data.student_name,
              gradeName: res.data.grade_name
            });
          } else {
            toast.error('Could not load student profile context.');
          }
        })
        .catch(err => {
          console.error(err);
          if (err?.response?.status === 404) {
            toast.error('No student profile is linked to this account.');
          } else {
            toast.error('Failed to resolve student identity.');
          }
        })
        .finally(() => setLoading(false));
    } else {
      // If we have student ID (e.g. parent dashboard context), fetch their minimal info for header display
      api.get(`/students/${resolvedStudentId}`)
        .then(res => {
          if (res.data) {
            setStudentInfo({
              fullName: res.data.fullName,
              gradeName: res.data.gradeDisplay || res.data.gradeName
            });
          }
        })
        .catch(err => console.error('Failed to fetch student details', err));
    }
  }, [resolvedStudentId]);

  // 2. Fetch events based on current view range
  const fetchCalendarEvents = useCallback(async () => {
    if (!activeStudentId) return;

    setLoading(true);
    try {
      // Determine date range based on view mode and currentDate
      let start: Date;
      let end: Date;

      if (view === 'day') {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        const monday = new Date(currentDate);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        start = monday;
        end = new Date(monday);
        end.setDate(monday.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        // Month view: grab start and end of the current month with a margin
        start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 20);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 10);
      }

      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const data = await studentCalendarService.getStudentCalendar(activeStudentId, startStr, endStr);
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [activeStudentId, view, currentDate]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Navigation handlers
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (view === 'day') nextDate.setDate(nextDate.getDate() - 1);
    else if (view === 'week') nextDate.setDate(nextDate.getDate() - 7);
    else nextDate.setMonth(nextDate.getMonth() - 1);
    setDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (view === 'day') nextDate.setDate(nextDate.getDate() + 1);
    else if (view === 'week') nextDate.setDate(nextDate.getDate() + 7);
    else nextDate.setMonth(nextDate.getMonth() + 1);
    setDate(nextDate);
  };

  const handleToday = () => {
    setDate(new Date());
  };

  // Filter events
  const filteredEvents = React.useMemo(() => {
    if (filterType === 'All') return events;
    return events.filter(e => e.type === filterType);
  }, [events, filterType]);

  // Render Day list
  const renderDayView = () => {
    const dayStr = currentDate.toDateString();
    const dayEvents = filteredEvents.filter(e => new Date(e.start).toDateString() === dayStr);

    return (
      <div className="space-y-4">
        {dayEvents.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm text-slate-400 dark:text-[#64748b]">
            <CalendarIcon size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">No academic activities scheduled for this day.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayEvents.map(e => {
              const style = TYPE_STYLES[e.type] || TYPE_STYLES.Class;
              const Icon = style.icon;
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 hover:shadow-md transition-all space-y-3 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-[#475569]"
                >
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text} uppercase tracking-wider`}>
                      <Icon size={10} />
                      {style.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-[#283548] border border-slate-100 dark:border-[#334155] px-2 py-0.5 rounded text-slate-600 dark:text-[#cbd5e1]">
                      {fmtTime(e.start)}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-sm line-clamp-2 leading-snug">{e.title}</h4>
                  {e.teacherName && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
                      <Users size={12} className="text-slate-400" />
                      <span>{e.teacherName}</span>
                    </div>
                  )}
                  {e.venue && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{e.venue}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render Week view
  const renderWeekView = () => {
    // Generate week days
    const weekStart = new Date(currentDate);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });

    return (
      <div className="space-y-4">
        {weekDays.map(day => {
          const dayStr = day.toDateString();
          const dayEvents = filteredEvents.filter(e => new Date(e.start).toDateString() === dayStr);
          return (
            <div key={dayStr} className="bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
              <div className="bg-slate-50/80 dark:bg-[#283548]/80 border-b border-slate-100 dark:border-[#334155] px-5 py-3.5 flex justify-between items-center">
                <span className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">
                  {day.toLocaleDateString('en-US', { weekday: 'long' })} — {fmtDate(day)}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-[#94a3b8]">
                  {dayEvents.length} activities
                </span>
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-[#64748b] text-center py-6 font-semibold">No schedule periods or exams.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                  {dayEvents.map(e => {
                    const style = TYPE_STYLES[e.type] || TYPE_STYLES.Class;
                    const Icon = style.icon;
                    return (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-[#334155] hover:border-slate-200 dark:hover:border-[#475569] rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text} uppercase tracking-wider`}>
                            <Icon size={8} />
                            {e.type}
                          </span>
                          <h5 className="font-extrabold text-slate-800 dark:text-white text-xs line-clamp-2 leading-tight">{e.title}</h5>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-[#283548] mt-3">
                          <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-[#cbd5e1]">{fmtTime(e.start)}</span>
                          {e.status && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-[#283548] px-1.5 py-0.5 rounded text-slate-500 dark:text-[#94a3b8]">{e.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const days: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
    ];

    const eventsByDay = filteredEvents.reduce<Record<number, StudentCalendarEvent[]>>((acc, ev) => {
      const evDate = new Date(ev.start);
      if (evDate.getMonth() === month && evDate.getFullYear() === year) {
        const d = evDate.getDate();
        acc[d] = acc[d] ? [...acc[d], ev] : [ev];
      }
      return acc;
    }, {});

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-7 mb-1 gap-1">
          {dayNames.map(d => (
            <div key={d} className="text-xs font-black text-slate-400 dark:text-[#64748b] text-center py-2 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, idx) => {
            const evs = d ? (eventsByDay[d] ?? []) : [];
            const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            return (
              <div
                key={idx}
                className={`min-h-[90px] p-2 rounded-xl border text-xs transition-all flex flex-col justify-between
                  ${d ? 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-slate-300 dark:hover:border-[#475569] shadow-sm' : 'border-transparent bg-transparent'}
                  ${isToday ? 'ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10' : ''}`}
              >
                {d && (
                  <>
                    <div>
                      <p className={`text-[11px] font-black mb-1.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-[#94a3b8]'}`}>{d}</p>
                      <div className="space-y-1">
                        {evs.slice(0, 3).map((ev, i) => (
                          <div
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded truncate font-black shadow-2xs border cursor-pointer hover:brightness-95 transition-all"
                            style={{ backgroundColor: ev.color + '15', color: ev.color, borderColor: ev.color + '25' }}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                      </div>
                    </div>
                    {evs.length > 3 && (
                      <p className="text-slate-400 dark:text-[#64748b] text-[9px] font-black mt-1 pl-1">+{evs.length - 3} more</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6   mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Academic Calendar</h2>
              {studentInfo && (
                <p className="text-xs font-bold text-slate-500 dark:text-[#cbd5e1] mt-0.5">
                  {studentInfo.fullName} • {studentInfo.gradeName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex bg-slate-100 dark:bg-[#283548] p-1 rounded-xl border border-slate-200/50 dark:border-[#334155]/50 self-start sm:self-auto shadow-inner">
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${view === v ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-800'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 dark:bg-[#283548]/40 border border-slate-200/50 dark:border-[#334155]/50 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-xs"><ChevronLeft size={16} className="text-slate-600 dark:text-[#cbd5e1]" /></button>
          <button onClick={handleToday} className="px-3.5 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer shadow-xs text-slate-700 dark:text-[#cbd5e1]">Today</button>
          <button onClick={handleNext} className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-xs"><ChevronRight size={16} className="text-slate-600 dark:text-[#cbd5e1]" /></button>

          <span className="font-extrabold text-slate-800 dark:text-white text-sm sm:text-base pl-2">
            {view === 'day' && fmtDate(currentDate)}
            {view === 'week' && `Week of ${fmtDate(new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1)))}`}
            {view === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Class', 'Exam', 'Event'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-2xs ${filterType === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50'}`}
            >
              {t === 'All' ? 'All Activities' : t === 'Class' ? 'Classes' : t === 'Exam' ? 'Exams' : 'School Events'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar View Area */}
      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-32 bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-[#334155] rounded-2xl shadow-sm">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="transition-all duration-300">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>
      )}

      {/* Event Details Modal Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-[#283548] rounded-lg transition-all cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-[#cbd5e1]"
            >
              &times;
            </button>
            <div className="space-y-4">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full border ${TYPE_STYLES[selectedEvent.type]?.bg} ${TYPE_STYLES[selectedEvent.type]?.border} ${TYPE_STYLES[selectedEvent.type]?.text} uppercase tracking-wider`}>
                {selectedEvent.type}
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight leading-snug">{selectedEvent.title}</h3>

              <div className="space-y-2.5 pt-2 text-xs font-semibold text-slate-600 dark:text-[#cbd5e1] border-t border-slate-100 dark:border-[#334155]">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span>Time: {fmtTime(selectedEvent.start)} - {fmtTime(selectedEvent.end)}</span>
                </div>
                {selectedEvent.subjectName && (
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-slate-400" />
                    <span>Subject: {selectedEvent.subjectName}</span>
                  </div>
                )}
                {selectedEvent.teacherName && (
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <span>Teacher: {selectedEvent.teacherName}</span>
                  </div>
                )}
                {selectedEvent.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span>Venue: {selectedEvent.venue}</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-200/40 dark:border-[#334155]/40 rounded-xl p-3.5 text-xs text-slate-600 dark:text-[#cbd5e1] space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">
                    <Info size={10} />
                    <span>Description / Details</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar;
