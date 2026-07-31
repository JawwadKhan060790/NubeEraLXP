import {
  AlertCircle,
  BarChart2,
  BookOpen, CheckCircle2,
  ChevronDown, ChevronRight,
  Circle, Clock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/services/api';
import {
  teacherEnhancedService,
  type ModuleProgress,
  type TeacherLearningPath,
  type TopicProgress,
} from '../../../services/teacherEnhancedService';

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NotStarted: { label: 'Not Started', text: 'text-violet-700', border: 'border-violet-100', bg: 'bg-violet-50/50', icon: Circle },
  InProgress: { label: 'In Progress', text: 'text-amber-700', border: 'border-amber-100', bg: 'bg-amber-50/50', icon: Clock },
  Completed: { label: 'Completed', text: 'text-emerald-700 border-emerald-100', bg: 'bg-emerald-50/50', icon: CheckCircle2 },
};

const StatusBadge: React.FC<{ status: TopicProgress['status'] }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NotStarted;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg}  ${cfg.text}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`relative h-2 bg-slate-100 rounded-full overflow-hidden ${className}`}>
    <div
      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 bg-indigo-600"
      style={{ width: `${Math.min(100, value)}%` }}
    />
  </div>
);

// ── Topic row ─────────────────────────────────────────────────────────────────

const TopicRow: React.FC<{
  topic: TopicProgress;
  gradeId: string;
  moduleId: string;
  onStatusChange: (lessonId: string, gradeId: string, moduleId: string, status: string) => void;
  updating: boolean;
}> = ({ topic, gradeId, moduleId, onStatusChange, updating }) => {
  const statusOrder: Array<TopicProgress['status']> = ['NotStarted', 'InProgress', 'Completed'];
  const currentIdx = statusOrder.indexOf(topic.status);
  const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50/80 rounded-xl group transition-all">
      <span className="text-[11px] text-slate-400 w-6 text-center font-bold font-mono shrink-0">{topic.serial_number}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-700 truncate">{topic.sub_topic}</p>
        {topic.is_activity && (
          <span className="inline-flex items-center text-[10px] text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-full font-bold mt-0.5">Activity</span>
        )}
      </div>

      {topic.completed_at && (
        <span className="text-xs text-slate-400 font-semibold hidden sm:block">
          {new Date(topic.completed_at).toLocaleDateString()}
        </span>
      )}

      <StatusBadge status={topic.status} />

      <button
        onClick={() => onStatusChange(topic.lesson_id, gradeId, moduleId, nextStatus)}
        disabled={updating}
        className="opacity-0 group-hover:opacity-100 transition-all text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 bg-white hover:bg-indigo-50/25 disabled:opacity-40 shadow-xs cursor-pointer"
        title={`Mark as ${nextStatus}`}
      >
        {updating ? <Loader2 size={12} className="animate-spin" /> : '→ ' + nextStatus.replace(/([A-Z])/g, ' $1').trim()}
      </button>
    </div>
  );
};

// ── Module accordion ──────────────────────────────────────────────────────────

const ModuleCard: React.FC<{
  module: ModuleProgress;
  gradeId: string;
  onStatusChange: (lessonId: string, gradeId: string, moduleId: string, status: string) => void;
  updatingLesson: string | null;
}> = ({ module, gradeId, onStatusChange, updatingLesson }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
      >
        {expanded ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
        <BookOpen size={15} className="text-indigo-600 shrink-0" />
        <span className="flex-1 font-extrabold text-slate-800 text-sm tracking-tight">{module.module_name}</span>
        <span className="text-xs text-slate-400 font-bold mr-2">
          {module.completed_lessons}/{module.total_lessons} topics
        </span>
        <span className="text-sm font-black text-indigo-600">
          {module.completion_percentage.toFixed(0)}%
        </span>
      </button>

      <div className="px-5 pb-3">
        <ProgressBar value={module.completion_percentage} />
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-2 divide-y divide-slate-100/50">
          {module.topics.map(topic => (
            <TopicRow
              key={topic.lesson_id}
              topic={topic}
              gradeId={gradeId}
              moduleId={module.module_id}
              onStatusChange={onStatusChange}
              updating={updatingLesson === topic.lesson_id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ElementType; iconColor: string; iconBg: string }> = ({
  label, value, icon: Icon, iconColor, iconBg,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] transition-all">
    <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-800 leading-none">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Main page ─────────────────────────────────────────────────────────────────

const TeacherLearningPath: React.FC = () => {
  const [user] = useState<any>(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const roleStr = String(user?.utype || user?.role || user?.userType || user?.uType || '').toLowerCase();
  const isManagement = ['admin', 'superadmin', 'staff', 'principal'].includes(roleStr) || Boolean(user && !user.teacher_id && !user.teacherId);

  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const [paths, setPaths] = useState<TeacherLearningPath[]>([]);
  const [selected, setSelected] = useState<TeacherLearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingLesson, setUpdatingLesson] = useState<string | null>(null);

  // Load schools & teachers for Management roles
  useEffect(() => {
    if (isManagement) {
      api.get('/schools').then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        setSchools(list);
      }).catch(() => { });

      api.get('/teachers').then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        setTeachers(list);
      }).catch(() => { });
    }
  }, [isManagement]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (selectedTeacherId) params.teacherId = selectedTeacherId;
      const res = await api.get('/teacher/learning-path', { params });
      const raw = res.data;
      const data: TeacherLearningPath[] = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.items) ? raw.items : []));

      setPaths(data);
      if (data && data.length > 0) setSelected(data[0]);
      else setSelected(null);
    } catch {
      toast.error('Failed to load syllabus completion tracking.');
      setPaths([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId]);

  useEffect(() => { load(); }, [load]);

  const handleGradeChange = async (gradeId: string) => {
    try {
      const params: Record<string, any> = {};
      if (selectedTeacherId) params.teacherId = selectedTeacherId;
      const res = await api.get(`/teacher/learning-path/${gradeId}`, { params });
      const path = Array.isArray(res.data) ? res.data[0] : (res.data?.data || res.data);
      if (path && typeof path === 'object') {
        setSelected(path);
      }
    } catch {
      toast.error('Failed to load grade syllabus details.');
    }
  };

  const handleStatusChange = async (lessonId: string, gradeId: string, moduleId: string, status: string) => {
    setUpdatingLesson(lessonId);
    try {
      const params: Record<string, any> = {};
      if (selectedTeacherId) params.teacherId = selectedTeacherId;
      await teacherEnhancedService.updateTopicStatus({ lesson_id: lessonId, grade_id: gradeId, module_id: moduleId, status });

      if (selected) {
        const res = await api.get(`/teacher/learning-path/${selected.grade_id}`, { params });
        const fresh = Array.isArray(res.data) ? res.data[0] : (res.data?.data || res.data);
        if (fresh && typeof fresh === 'object') {
          setSelected(fresh);
          setPaths(prev => prev.map(p => p.grade_id === fresh.grade_id ? fresh : p));
        }
      }
      toast.success('Topic status updated.');
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingLesson(null);
    }
  };

  // Unit completion calculations for selected grade
  const totalUnits = selected?.modules?.length || 0;
  const completedUnits = selected?.modules?.filter(m => m.completion_percentage === 100).length || 0;
  const inProgressUnits = selected?.modules?.filter(m => m.completion_percentage > 0 && m.completion_percentage < 100).length || 0;
  const remainingUnits = totalUnits - completedUnits;

  // Filter teachers by school if school is selected
  const filteredTeachers = selectedSchoolId
    ? teachers.filter(t => (t.school_id || t.schoolId) === selectedSchoolId)
    : teachers;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm max-w-6xl mx-auto p-20 animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto px-1 py-2 animate-in fade-in duration-300">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Syllabus Completion Tracker</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
            Track completed & remaining units and topics by grade & school
          </p>
        </div>
        <button
          onClick={load}
          className="bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 dark:border-[#334155] shadow-xs cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh Data
        </button>
      </div>

      {/* Management Filters Bar (Admin, Staff, Principal) */}
      {isManagement && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">
              Select Campus / School
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
                setSelectedTeacherId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All Schools</option>
              {schools.map(s => (
                <option key={s.id || s.Id} value={s.id || s.Id}>{s.name || s.Name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">
              Select Faculty Member
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Default Faculty View</option>
              {filteredTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name || t.fullName || `${t.first_name} ${t.last_name}`} ({t.school_name || t.schoolName || 'Faculty'})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-500 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm max-w-6xl mx-auto p-12 animate-in fade-in">
          <AlertCircle size={40} className="mb-3 text-slate-300 dark:text-[#64748b]" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No syllabus data found for this selection.</p>
          <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">Select another teacher or campus from the filter bar above.</p>
        </div>
      ) : (
        <>
          {/* Grade tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
            {paths.map(p => (
              <button
                key={p.grade_id}
                onClick={() => handleGradeChange(p.grade_id)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border cursor-pointer flex items-center gap-2
                  ${selected?.grade_id === p.grade_id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#334155] hover:border-indigo-500'}`}
              >
                {p.grade_name}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${selected?.grade_id === p.grade_id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#283548] text-indigo-600 dark:text-indigo-400'}`}>
                  {p.completion_percentage.toFixed(0)}%
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <>
              {/* Stat cards grid — Completed & Remaining Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <StatCard label="Total Units" value={totalUnits} icon={BookOpen} iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-50 dark:bg-violet-500/15" />
                <StatCard label="Units Done" value={completedUnits} icon={CheckCircle2} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-500/15" />
                <StatCard label="Units Remaining" value={remainingUnits} icon={Clock} iconColor="text-rose-500 dark:text-rose-400" iconBg="bg-rose-50 dark:bg-rose-500/15" />

                <StatCard label="Total Topics" value={selected.total_topics} icon={BookOpen} iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-500/15" />
                <StatCard label="Topics Done" value={selected.completed_topics} icon={CheckCircle2} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-500/15" />
                <StatCard label="Topics Remaining" value={selected.estimated_remaining_topics} icon={Circle} iconColor="text-amber-500 dark:text-amber-400" iconBg="bg-amber-50 dark:bg-amber-500/15" />
              </div>

              {/* Progress Bar + Remaining Summary Card */}
              <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-white text-base tracking-tight">{selected.grade_name} — Overall Syllabus Status</span>
                    <p className="text-xs font-semibold text-slate-400 dark:text-[#64748b] mt-0.5">
                      {completedUnits} of {totalUnits} Units Completed ({inProgressUnits} in progress)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {selected.completion_percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                </div>

                <ProgressBar value={selected.completion_percentage} className="h-3" />

                <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ {selected.completed_topics} Topics Completed</span>
                  <span className="text-rose-500 dark:text-rose-400">⏳ {selected.estimated_remaining_topics} Topics Remaining ({(100 - selected.completion_percentage).toFixed(1)}% Syllabus Remaining)</span>
                </div>
              </div>

              {/* Module accordions */}
              <div className="space-y-3">
                <h2 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-wide flex items-center gap-2 pl-1">
                  <BarChart2 size={16} className="text-indigo-600 dark:text-indigo-400" /> Units & Topics Breakdown
                </h2>
                {selected.modules.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm">No units found for {selected.grade_name}.</p>
                ) : (
                  selected.modules.map(module => (
                    <ModuleCard
                      key={module.module_id}
                      module={module}
                      gradeId={selected.grade_id}
                      onStatusChange={handleStatusChange}
                      updatingLesson={updatingLesson}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherLearningPath;
