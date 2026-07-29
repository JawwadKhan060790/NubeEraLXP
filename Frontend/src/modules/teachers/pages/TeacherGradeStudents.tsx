import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, TrendingUp, TrendingDown, Minus, BookOpen,
  BarChart2, Calendar, AlertTriangle, Loader2, RefreshCw,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  teacherEnhancedService,
  type GradeStudentList,
  type TeacherStudentRow,
} from '../../../services/teacherEnhancedService';
import { ROUTES } from '../../../constants/routes';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number; colorClass?: string }> = ({
  value,
  colorClass,
}) => {
  const pct   = Math.min(100, Math.max(0, value));
  const color = colorClass ?? (pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-500');
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const VelocityBadge: React.FC<{ velocity: TeacherStudentRow['learning_velocity'] }> = ({ velocity }) => {
  const map = {
    Fast:           { icon: TrendingUp,   bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700',  label: 'Fast'           },
    Average:        { icon: Minus,        bg: 'bg-amber-50/50',   border: 'border-amber-100',   text: 'text-amber-700',  label: 'Average'        },
    NeedsAttention: { icon: TrendingDown, bg: 'bg-rose-50/50',    border: 'border-rose-100',    text: 'text-rose-700',   label: 'Needs Attention' },
  };
  const cfg  = map[velocity] ?? map.Average;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

// ── Summary cards ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
}> = ({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] transition-all">
    <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-800 leading-none">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
      {sub && <p className="text-[10px] font-semibold text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Student row ───────────────────────────────────────────────────────────────

const StudentRow: React.FC<{
  student: TeacherStudentRow;
  onViewWeakness: (id: string) => void;
}> = ({ student, onViewWeakness }) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="px-4 py-3.5">
      <div>
        <p className="font-bold text-slate-800 text-sm">{student.student_name}</p>
        {student.roll_no && <p className="text-[10px] font-bold text-slate-400 mt-0.5">Roll #{student.roll_no}</p>}
      </div>
    </td>
    <td className="px-4 py-3.5">
      <VelocityBadge velocity={student.learning_velocity} />
    </td>
    <td className="px-4 py-3.5">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-500">
          <span>Attendance</span>
          <span>{student.attendance_percent.toFixed(0)}%</span>
        </div>
        <ProgressBar value={student.attendance_percent} />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-500">
          <span>Course</span>
          <span>{student.course_completion_percent.toFixed(0)}%</span>
        </div>
        <ProgressBar value={student.course_completion_percent} colorClass="bg-indigo-600" />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <div>
        {student.current_module_name && (
          <p className="text-slate-700 font-bold text-xs truncate max-w-[180px]">{student.current_module_name}</p>
        )}
        {student.current_topic_name && (
          <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[180px] mt-0.5">{student.current_topic_name}</p>
        )}
        {!student.current_module_name && <span className="text-xs text-slate-300">—</span>}
      </div>
    </td>
    <td className="px-4 py-3.5 text-center">
      {student.weak_topics_count > 0 ? (
        <button
          onClick={() => onViewWeakness(student.student_id)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
        >
          <AlertTriangle size={11} />
          {student.weak_topics_count}
        </button>
      ) : (
        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ None</span>
      )}
    </td>
    <td className="px-4 py-3.5 text-xs font-semibold text-slate-400">
      {student.last_activity_date
        ? new Date(student.last_activity_date).toLocaleDateString()
        : '—'}
    </td>
    <td className="px-4 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-all">
      <button
        onClick={() => onViewWeakness(student.student_id)}
        className="text-indigo-600 hover:text-indigo-750 font-extrabold text-xs flex items-center gap-1 ml-auto cursor-pointer"
      >
        Details <ChevronRight size={12} />
      </button>
    </td>
  </tr>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const TeacherGradeStudents: React.FC = () => {
  const navigate = useNavigate();

  // We start with a null grade (we'll let user pick from grades fetched via
  // the enhanced dashboard, but we actually call getGradeStudentList by grade).
  // We seed available grades from the learning path summary.
  const [grades, setGrades]       = useState<{ grade_id: string; grade_name: string; section_id?: string; section_name?: string }[]>([]);
  const [selectedGradeId, setGid] = useState<string>('');
  const [selectedSectionId, setSectionId] = useState<string | undefined>(undefined);
  const [data, setData]           = useState<GradeStudentList | null>(null);
  const [loading, setLoading]     = useState(false);
  const [gradesLoading, setGL]    = useState(true);

  // Each grade tab is uniquely identified by grade_id + section_id, since a
  // teacher can have several tabs for the same grade (one per division, plus
  // possibly one with no division). Using grade_id alone for the React key /
  // "is this tab selected" check made every same-grade tab light up together.
  const tabKey = (g: { grade_id: string; section_id?: string }) => `${g.grade_id}::${g.section_id ?? 'none'}`;

  // Load grade list from learning-path summary (gives us list of teacher's grades)
  const loadGrades = useCallback(async () => {
    setGL(true);
    try {
      const paths = await teacherEnhancedService.getLearningPaths();
      const gs    = paths.map(p => ({ grade_id: p.grade_id, grade_name: p.grade_name, section_id: p.section_id, section_name: p.section_name }));
      setGrades(gs);
      if (gs.length > 0) { setGid(gs[0].grade_id); setSectionId(gs[0].section_id); }
    } catch {
      toast.error('Failed to load grade list.');
    } finally {
      setGL(false);
    }
  }, []);

  const loadStudents = useCallback(async (gradeId: string) => {
    if (!gradeId) return;
    setLoading(true);
    try {
      const d = await teacherEnhancedService.getGradeStudentList(gradeId);
      setData(d);
    } catch {
      toast.error('Failed to load student list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrades(); }, [loadGrades]);
  useEffect(() => { if (selectedGradeId) loadStudents(selectedGradeId); }, [selectedGradeId, loadStudents]);

  const handleViewWeakness = (studentId: string) => {
    navigate(`${ROUTES.TEACHER_STUDENT_WEAKNESS}?studentId=${studentId}`);
  };

  if (gradesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-7xl mx-auto p-20 animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto px-1 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Grade-wise Students</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Monitor attendance, progress, and learning velocity per grade
          </p>
        </div>
        <button
          onClick={() => loadStudents(selectedGradeId)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Grade tabs */}
      {grades.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400 font-bold">No grades assigned.</div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1.5">
            {grades.map(g => (
              <button
                key={tabKey(g)}
                onClick={() => { setGid(g.grade_id); setSectionId(g.section_id); }}
                className={`shrink-0 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border cursor-pointer
                  ${selectedGradeId === g.grade_id && selectedSectionId === g.section_id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'}`}
              >
                {g.grade_name}{g.section_name ? ` — ${g.section_name}` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
          ) : data ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Total Students" value={data.students.length}
                  icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50"
                />
                <SummaryCard
                  label="Avg. Attendance" value={`${data.average_attendance_percent.toFixed(1)}%`}
                  icon={Calendar} iconColor="text-blue-600" iconBg="bg-blue-50"
                />
                <SummaryCard
                  label="Grade Completion" value={`${data.grade_completion_percent.toFixed(1)}%`}
                  sub={`${data.completed_students} completed`}
                  icon={BookOpen} iconColor="text-emerald-600" iconBg="bg-emerald-50"
                />
                <SummaryCard
                  label="Behind Schedule" value={data.behind_schedule_students}
                  icon={AlertTriangle} iconColor="text-rose-600" iconBg="bg-rose-50"
                />
              </div>

              {/* Periods bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                    <BarChart2 size={15} className="text-indigo-600" /> Periods Conducted
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {data.total_periods_conducted} / {data.total_periods_planned}
                    <span className="text-slate-400 font-bold ml-1">({data.periods_completion_percent.toFixed(0)}%)</span>
                  </span>
                </div>
                <ProgressBar value={data.periods_completion_percent} colorClass="bg-indigo-600" />
                <div className="flex gap-4 text-[11px] font-bold">
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">{data.completed_students} ✓ Completed</span>
                  <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">{data.in_progress_students} ⟳ In Progress</span>
                  <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">{data.behind_schedule_students} ⚠ Behind</span>
                </div>
              </div>

              {/* Student table */}
              {data.students.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400">
                  <Users size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm font-bold">No students found in this grade.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Velocity</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] min-w-[130px]">Attendance</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] min-w-[130px]">Course</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Topic</th>
                          <th className="text-center px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Weak Topics</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Last Active</th>
                          <th className="px-4 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.students.map(s => (
                          <StudentRow key={s.student_id} student={s} onViewWeakness={handleViewWeakness} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

export default TeacherGradeStudents;
