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
import {
  teacherEnhancedService,
  type ModuleProgress,
  type TeacherLearningPath,
  type TopicProgress,
} from '../../../services/teacherEnhancedService';

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NotStarted: { label: 'Not Started', text: 'text-violet-700', border: 'border-violet-100', bg: 'bg-violet-50/50', icon: Circle },
  InProgress: { label: 'In Progress', text: 'text-amber-700',  border: 'border-amber-100',  bg: 'bg-amber-50/50',  icon: Clock },
  Completed:  { label: 'Completed',   text: 'text-emerald-700 border-emerald-100', bg: 'bg-emerald-50/50', icon: CheckCircle2 },
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

const TeacherLearningPath: React.FC = () => {
  const [paths, setPaths]       = useState<TeacherLearningPath[]>([]);
  const [selected, setSelected] = useState<TeacherLearningPath | null>(null);
  const [loading, setLoading]   = useState(true);
  const [updatingLesson, setUpdatingLesson] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherEnhancedService.getLearningPaths();
      setPaths(data);
      if (data.length > 0) setSelected(data[0]);
    } catch {
      toast.error('Failed to load learning path.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGradeChange = async (gradeId: string) => {
    try {
      const path = await teacherEnhancedService.getLearningPathByGrade(gradeId);
      setSelected(path);
    } catch {
      toast.error('Failed to load grade learning path.');
    }
  };

  const handleStatusChange = async (lessonId: string, gradeId: string, moduleId: string, status: string) => {
    setUpdatingLesson(lessonId);
    try {
      await teacherEnhancedService.updateTopicStatus({ lesson_id: lessonId, grade_id: gradeId, module_id: moduleId, status });
      // Refresh the selected grade
      if (selected) {
        const fresh = await teacherEnhancedService.getLearningPathByGrade(selected.grade_id);
        setSelected(fresh);
        // Also update the summary in paths list
        setPaths(prev => prev.map(p => p.grade_id === fresh.grade_id ? fresh : p));
      }
      toast.success('Topic status updated.');
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingLesson(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-6xl mx-auto p-20 animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-6xl mx-auto p-20 animate-in fade-in">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <p className="text-base font-bold">No grades assigned yet.</p>
        <p className="text-xs text-slate-400 mt-1">Contact admin or staff to assign grades to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto px-1 py-2 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">My Learning Path</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Track your syllabus progress grade by grade
          </p>
        </div>
        <button
          onClick={load}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Grade tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5">
        {paths.map(p => (
          <button
            key={p.grade_id}
            onClick={() => handleGradeChange(p.grade_id)}
            className={`shrink-0 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border cursor-pointer
              ${selected?.grade_id === p.grade_id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'}`}
          >
            {p.grade_name}
            <span className={`ml-2 text-[10px] font-black ${selected?.grade_id === p.grade_id ? 'text-white/70' : 'text-slate-400'}`}>
              {p.completion_percentage.toFixed(0)}%
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Topics"      value={selected.total_topics}       icon={BookOpen}    iconColor="text-violet-600" iconBg="bg-violet-50" />
            <StatCard label="Completed"         value={selected.completed_topics}   icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <StatCard label="In Progress"       value={selected.in_progress_topics} icon={Clock}       iconColor="text-amber-500" iconBg="bg-amber-50" />
            <StatCard label="Pending"           value={selected.pending_topics}     icon={Circle}      iconColor="text-slate-500" iconBg="bg-slate-50" />
          </div>

          {/* Progress bar + percentage */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight">{selected.grade_name} — Overall Progress</span>
              <span className="text-2xl font-black text-indigo-600">
                {selected.completion_percentage.toFixed(1)}%
              </span>
            </div>
            <ProgressBar value={selected.completion_percentage} className="h-3" />
            <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1.5">
              <span>0%</span>
              <span>Estimated remaining: {selected.estimated_remaining_topics} topics</span>
              <span>100%</span>
            </div>
          </div>

          {/* Module accordions */}
          <div className="space-y-3">
            <h2 className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-2 pl-1">
              <BarChart2 size={16} className="text-primary" /> Topics by Module
            </h2>
            {selected.modules.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">No modules found for {selected.grade_name}.</p>
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
    </div>
  );
};

export default TeacherLearningPath;
