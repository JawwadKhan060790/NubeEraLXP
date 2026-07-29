import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, BookOpen, BarChart2,
  Loader2, RefreshCw, ChevronDown, ChevronRight, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  teacherEnhancedService,
  type GradeWeaknessAnalysis,
  type StudentWeaknessAnalysis,
  type StudentWeakTopic,
} from '../../../services/teacherEnhancedService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  High:   { bg: 'bg-rose-50/50',    text: 'text-rose-700',    border: 'border-rose-100'   },
  Medium: { bg: 'bg-amber-50/50',  text: 'text-amber-700',  border: 'border-amber-100' },
  Low:    { bg: 'bg-violet-50/50', text: 'text-violet-700', border: 'border-violet-100' },
};

const WeaknessBadge: React.FC<{ level: StudentWeakTopic['weakness_level'] }> = ({ level }) => {
  const s = LEVEL_STYLE[level] ?? LEVEL_STYLE.Low;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <AlertTriangle size={10} />
      {level}
    </span>
  );
};

const ScoreBar: React.FC<{ score: number; maxScore: number }> = ({ score, maxScore }) => {
  const pct   = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 35 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3 text-[11px] font-bold">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 font-mono shrink-0">{score}/{maxScore}</span>
    </div>
  );
};

// ── Topic card ────────────────────────────────────────────────────────────────

const TopicCard: React.FC<{
  topic: StudentWeakTopic;
  onResolve: (id: string) => void;
  resolving: boolean;
}> = ({ topic, onResolve, resolving }) => (
  <div className={`rounded-2xl border p-5 space-y-3 shadow-2xs transition-all hover:shadow-xs bg-white ${topic.is_resolved ? 'border-emerald-100 bg-emerald-50/20 opacity-80' : LEVEL_STYLE[topic.weakness_level]?.border ?? 'border-slate-200/80'}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm leading-snug truncate" title={topic.lesson_name}>{topic.lesson_name}</p>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{topic.module_name}</p>
      </div>
      {topic.is_resolved ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold shrink-0">
          <CheckCircle2 size={11} /> Resolved
        </span>
      ) : (
        <WeaknessBadge level={topic.weakness_level} />
      )}
    </div>

    <ScoreBar score={topic.score} maxScore={topic.max_score} />

    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
      <span>Source: {topic.source}</span>
      <span>{topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}</span>
    </div>

    {topic.recommended_revision && (
      <p className="text-[11px] font-semibold text-indigo-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">💡 {topic.recommended_revision}</p>
    )}

    {!topic.is_resolved && (
      <button
        onClick={() => onResolve(topic.id)}
        disabled={resolving}
        className="w-full text-xs py-2 rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
      >
        {resolving ? <Loader2 size={12} className="inline animate-spin mr-1.5" /> : '✓ Mark Resolved'}
      </button>
    )}
  </div>
);

// ── Student accordion ─────────────────────────────────────────────────────────

const StudentAccordion: React.FC<{
  analysis: StudentWeaknessAnalysis;
  defaultOpen?: boolean;
  resolvingId: string | null;
  onResolve: (id: string) => void;
}> = ({ analysis, defaultOpen = false, resolvingId, onResolve }) => {
  const [open, setOpen] = useState(defaultOpen);
  const active = analysis.weak_topics.filter(t => !t.is_resolved);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-slate-50/50 text-left transition-colors cursor-pointer"
      >
        {open ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
        <span className="flex-1 font-extrabold text-slate-800 text-sm tracking-tight">{analysis.student_name}</span>
        <div className="flex gap-2 text-[10px] font-bold shrink-0">
          {analysis.high_weakness > 0 && (
            <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">{analysis.high_weakness} High</span>
          )}
          {analysis.medium_weakness > 0 && (
            <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{analysis.medium_weakness} Med</span>
          )}
          {analysis.low_weakness > 0 && (
            <span className="text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">{analysis.low_weakness} Low</span>
          )}
          {active.length === 0 && (
            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ All clear</span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-5">
          {analysis.weak_topics.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-6">No weak topics found.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.weak_topics.map(t => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  onResolve={onResolve}
                  resolving={resolvingId === t.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Top weak topics ───────────────────────────────────────────────────────────

const TopWeakTopics: React.FC<{ topics: GradeWeaknessAnalysis['top_weak_topics'] }> = ({ topics }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
    <h2 className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-2 pl-1">
      <BarChart2 size={16} className="text-rose-500" /> Top Weak Topics Across Grade
    </h2>
    {topics.length === 0 ? (
      <p className="text-xs font-bold text-slate-400 pl-1">No weak topics identified yet.</p>
    ) : (
      <div className="space-y-3">
        {topics.map((t, i) => (
          <div key={t.lesson_id} className="flex items-center gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl transition-all hover:scale-[1.01]">
            <span className="text-lg font-black text-slate-300 w-6 text-center shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{t.topic_name}</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{t.module_name}</p>
            </div>
            <div className="text-right text-xs shrink-0 font-bold">
              <p className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">{t.affected_students} students</p>
              <p className="text-slate-400 mt-1">avg {t.average_score.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const StudentWeaknessAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const qStudentId = searchParams.get('studentId') ?? '';

  const [grades, setGrades]         = useState<{ grade_id: string; grade_name: string }[]>([]);
  const [selectedGradeId, setGid]   = useState<string>('');
  const [gradeData, setGradeData]   = useState<GradeWeaknessAnalysis | null>(null);
  const [studentFilter, setFilter]  = useState(qStudentId);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [resolvingId, setResolving] = useState<string | null>(null);
  const [gradesLoading, setGL]      = useState(true);

  const loadGrades = useCallback(async () => {
    setGL(true);
    try {
      const paths = await teacherEnhancedService.getLearningPaths();
      const gs    = paths.map(p => ({ grade_id: p.grade_id, grade_name: p.grade_name }));
      setGrades(gs);
      if (gs.length > 0) setGid(gs[0].grade_id);
    } catch {
      toast.error('Failed to load grades.');
    } finally {
      setGL(false);
    }
  }, []);

  const loadGradeData = useCallback(async (gradeId: string) => {
    if (!gradeId) return;
    setLoading(true);
    try {
      const d = await teacherEnhancedService.getGradeWeakness(gradeId);
      setGradeData(d);
    } catch {
      toast.error('Failed to load weakness data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrades(); }, [loadGrades]);
  useEffect(() => { if (selectedGradeId) loadGradeData(selectedGradeId); }, [selectedGradeId, loadGradeData]);

  const handleSync = async () => {
    if (!selectedGradeId) return;
    setSyncing(true);
    try {
      const res = await teacherEnhancedService.syncWeaknessFromResults(selectedGradeId);
      toast.success(res.message || 'Weakness data synced from exam results.');
      await loadGradeData(selectedGradeId);
    } catch {
      toast.error('Failed to sync weakness data.');
    } finally {
      setSyncing(false);
    }
  };

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await teacherEnhancedService.resolveWeakTopic(id);
      toast.success('Topic marked as resolved.');
      if (selectedGradeId) await loadGradeData(selectedGradeId);
    } catch {
      toast.error('Failed to resolve topic.');
    } finally {
      setResolving(null);
    }
  };

  const filteredStudents = gradeData?.students.filter(s =>
    !studentFilter || s.student_id === studentFilter ||
    s.student_name.toLowerCase().includes(studentFilter.toLowerCase())
  ) ?? [];

  if (gradesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-7xl mx-auto p-20 animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto px-1 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Student Weakness Analysis</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Identify weak topics from exams, quizzes, and assignments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing || !selectedGradeId}
            className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Sync from Results
          </button>
          <button
            onClick={() => loadGradeData(selectedGradeId)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Grade tabs */}
      {grades.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400 font-bold">No grades assigned.</div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {grades.map(g => (
                <button
                  key={g.grade_id}
                  onClick={() => { setGid(g.grade_id); setFilter(''); }}
                  className={`shrink-0 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border cursor-pointer
                    ${selectedGradeId === g.grade_id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'}`}
                >
                  {g.grade_name}
                </button>
              ))}
            </div>

            {/* Student filter */}
            <input
              type="text"
              placeholder="Filter by student name…"
              value={studentFilter}
              onChange={e => setFilter(e.target.value)}
              className="text-[10px] uppercase tracking-widest border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500/30 min-w-[200px] shadow-sm bg-white font-bold text-slate-700 placeholder-slate-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
          ) : gradeData ? (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-sm hover:scale-[1.02] transition-all bg-slate-50/50">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-800">{gradeData.total_weak_instances}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Total Weak Instances</p>
                </div>
                <div className="bg-white rounded-2xl border border-rose-100 p-5 text-center shadow-sm hover:scale-[1.02] transition-all bg-rose-50/30">
                  <p className="text-3xl font-extrabold tracking-tight text-rose-700">{gradeData.students.reduce((a, s) => a + s.high_weakness, 0)}</p>
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest mt-1.5">High Severity</p>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 p-5 text-center shadow-sm hover:scale-[1.02] transition-all bg-amber-50/30">
                  <p className="text-3xl font-extrabold tracking-tight text-amber-700">{gradeData.students.reduce((a, s) => a + s.medium_weakness, 0)}</p>
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mt-1.5">Medium Severity</p>
                </div>
                <div className="bg-white rounded-2xl border border-emerald-100 p-5 text-center shadow-sm hover:scale-[1.02] transition-all bg-emerald-50/30">
                  <p className="text-3xl font-extrabold tracking-tight text-emerald-700">{gradeData.students.reduce((a, s) => a + s.resolved_count, 0)}</p>
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mt-1.5">Resolved</p>
                </div>
              </div>

              {/* Top weak topics */}
              {gradeData.top_weak_topics.length > 0 && (
                <TopWeakTopics topics={gradeData.top_weak_topics} />
              )}

              {/* Student accordions */}
              <div className="space-y-3">
                <h2 className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-2 pl-1">
                  <BookOpen size={15} className="text-indigo-600" /> Per-Student Breakdown
                  {studentFilter && (
                    <span className="text-xs text-slate-400 font-bold ml-1">
                      ({filteredStudents.length} shown)
                    </span>
                  )}
                </h2>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400">
                    <AlertTriangle size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-bold">
                      {studentFilter
                        ? `No students match "${studentFilter}".`
                        : 'No weakness data available. Click "Sync from Results" to import.'}
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((s, i) => (
                    <StudentAccordion
                      key={s.student_id}
                      analysis={s}
                      defaultOpen={i === 0 || s.student_id === qStudentId}
                      resolvingId={resolvingId}
                      onResolve={handleResolve}
                    />
                  ))
                )}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

export default StudentWeaknessAnalysis;
