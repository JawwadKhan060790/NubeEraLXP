import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, TrendingUp, TrendingDown, Minus, BookOpen,
  BarChart2, Calendar, AlertTriangle, Loader2, RefreshCw,
  ChevronRight, Search, Filter, HelpCircle, CheckCircle2
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
    Fast:           { icon: TrendingUp,   bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-700',  label: 'Fast Pace' },
    Average:        { icon: Minus,        bg: 'bg-blue-50/70',    border: 'border-blue-200',    text: 'text-blue-700',   label: 'Average Pace' },
    NeedsAttention: { icon: AlertTriangle, bg: 'bg-rose-50/70',    border: 'border-rose-200',    text: 'text-rose-700',   label: 'Needs Attention' },
  };
  const cfg  = map[velocity] ?? map.Average;
  const Icon = cfg.icon;
  return (
    <span 
      title={velocity === 'NeedsAttention' ? 'Student has weak topics or low test scores needing attention' : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.text} shadow-2xs`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

// ── Summary cards ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; iconColor: string; iconBg: string; borderGlow?: string;
}> = ({ label, value, sub, icon: Icon, iconColor, iconBg, borderGlow }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all relative overflow-hidden ${borderGlow || ''}`}>
    <div className={`p-3.5 rounded-2xl ${iconBg} ${iconColor} shrink-0 shadow-2xs`}>
      <Icon size={22} />
    </div>
    <div className="min-w-0">
      <p className="text-3xl font-black tracking-tight text-slate-900 leading-none">{value}</p>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 truncate">{label}</p>
      {sub && <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">{sub}</p>}
    </div>
  </div>
);

// ── Student row ───────────────────────────────────────────────────────────────

const StudentRow: React.FC<{
  student: TeacherStudentRow;
  fallbackGradeName?: string;
  fallbackSectionName?: string;
  onViewWeakness: (id: string) => void;
}> = ({ student, fallbackGradeName, fallbackSectionName, onViewWeakness }) => {
  const initials = student.student_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const displayGrade = student.grade_name || fallbackGradeName || '—';
  const rawSec = student.section_name || (student as any).sectionName || fallbackSectionName;
  const displayDivision = rawSec ? ` — ${rawSec}` : '';

  return (
    <tr className="hover:bg-slate-50/70 transition-colors group">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
            {initials}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{student.student_name}</p>
            {student.roll_no && <p className="text-[10px] font-bold text-slate-400 mt-0.5">Roll #{student.roll_no}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-2xs whitespace-nowrap">
          {displayGrade}{displayDivision}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <VelocityBadge velocity={student.learning_velocity} />
      </td>
      <td className="px-4 py-3.5">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600">
            <span>Attendance</span>
            <span>{student.attendance_percent.toFixed(0)}%</span>
          </div>
          <ProgressBar value={student.attendance_percent} />
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600">
            <span>Course Progress</span>
            <span>{student.course_completion_percent.toFixed(0)}%</span>
          </div>
          <ProgressBar value={student.course_completion_percent} colorClass="bg-indigo-600" />
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div>
          {student.current_module_name && (
            <p className="text-slate-800 font-bold text-xs truncate max-w-[180px]">{student.current_module_name}</p>
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
            title="Click to view weak topic breakdown"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
          >
            <AlertTriangle size={11} className="text-rose-500" />
            {student.weak_topics_count} Weak
          </button>
        ) : (
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <CheckCircle2 size={11} /> None
          </span>
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
          className="text-indigo-600 hover:text-indigo-800 font-extrabold text-xs flex items-center gap-1 ml-auto cursor-pointer"
        >
          Details <ChevronRight size={12} />
        </button>
      </td>
    </tr>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const TeacherGradeStudents: React.FC = () => {
  const navigate = useNavigate();

  const [grades, setGrades]                 = useState<{ grade_id: string; grade_name: string; section_id?: string; section_name?: string }[]>([]);
  const [selectedGradeId, setGid]           = useState<string>('');
  const [selectedSectionId, setSectionId]   = useState<string | undefined>(undefined);
  const [data, setData]                     = useState<GradeStudentList | null>(null);
  const [loading, setLoading]               = useState(false);
  const [gradesLoading, setGL]              = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [velocityFilter, setVelocityFilter] = useState<'All' | 'NeedsAttention' | 'Fast' | 'Average'>('All');

  const tabKey = (g: { grade_id: string; section_id?: string }) => `${g.grade_id}::${g.section_id ?? 'none'}`;

  const loadGrades = useCallback(async () => {
    setGL(true);
    try {
      const paths = await teacherEnhancedService.getLearningPaths();
      const gs = paths.map((p: any) => ({
        grade_id: p.grade_id || p.gradeId,
        grade_name: p.grade_name || p.gradeName,
        section_id: p.section_id || p.sectionId,
        section_name: p.section_name || p.sectionName,
      }));
      setGrades(gs);
      if (gs.length > 0) { setGid(gs[0].grade_id); setSectionId(gs[0].section_id); }
    } catch {
      toast.error('Failed to load grade list.');
    } finally {
      setGL(false);
    }
  }, []);

  const loadStudents = useCallback(async (gradeId: string, sectionId?: string) => {
    if (!gradeId) return;
    setLoading(true);
    try {
      const d: any = await teacherEnhancedService.getGradeStudentList(gradeId, sectionId);
      if (d) {
        const rawStudents = d.students || d.Students || [];
        const normalizedStudents: TeacherStudentRow[] = rawStudents.map((s: any) => ({
          student_id: s.student_id || s.studentId || s.id,
          student_name: s.student_name || s.studentName || s.fullName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
          roll_no: s.roll_no || s.rollNo,
          grade_name: s.grade_name || s.gradeName,
          section_name: s.section_name || s.sectionName,
          attendance_percent: s.attendance_percent ?? s.attendancePercent ?? 0,
          course_completion_percent: s.course_completion_percent ?? s.courseCompletionPercent ?? 0,
          weak_topics_count: s.weak_topics_count ?? s.weakTopicsCount ?? 0,
          last_activity_date: s.last_activity_date || s.lastActivityDate,
          current_module_name: s.current_module_name || s.currentModuleName,
          current_topic_name: s.current_topic_name || s.currentTopicName,
          learning_velocity: s.learning_velocity || s.learningVelocity || 'Average',
        }));

        const normalizedData: GradeStudentList = {
          grade_id: d.grade_id || d.gradeId,
          grade_name: d.grade_name || d.gradeName,
          grade_completion_percent: d.grade_completion_percent ?? d.gradeCompletionPercent ?? 0,
          average_attendance_percent: d.average_attendance_percent ?? d.averageAttendancePercent ?? 0,
          total_periods_planned: d.total_periods_planned ?? d.totalPeriodsPlanned ?? 0,
          total_periods_conducted: d.total_periods_conducted ?? d.totalPeriodsConducted ?? 0,
          periods_completion_percent: d.periods_completion_percent ?? d.periodsCompletionPercent ?? 0,
          completed_students: d.completed_students ?? d.completedStudents ?? 0,
          in_progress_students: d.in_progress_students ?? d.inProgressStudents ?? 0,
          behind_schedule_students: d.behind_schedule_students ?? d.behindScheduleStudents ?? 0,
          students: normalizedStudents,
        };
        setData(normalizedData);
      } else {
        setData(null);
      }
    } catch {
      toast.error('Failed to load student list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrades(); }, [loadGrades]);
  useEffect(() => { if (selectedGradeId) loadStudents(selectedGradeId, selectedSectionId); }, [selectedGradeId, selectedSectionId, loadStudents]);

  const handleViewWeakness = (studentId: string) => {
    navigate(`${ROUTES.TEACHER_STUDENT_WEAKNESS}?studentId=${studentId}`);
  };

  const filteredStudents = data?.students.filter(s => {
    const matchesSearch = !searchQuery || s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.roll_no && s.roll_no.includes(searchQuery));
    const matchesVelocity = velocityFilter === 'All' || s.learning_velocity === velocityFilter;
    return matchesSearch && matchesVelocity;
  }) ?? [];

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
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Grade-wise Students</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Monitor attendance, course progress, and weak topic alerts per grade division
          </p>
        </div>
        <button
          onClick={() => loadStudents(selectedGradeId)}
          className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 border border-slate-200 shadow-xs cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh Data
        </button>
      </div>

      {/* Grade & Section tabs */}
      {grades.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400 font-bold">No grades assigned.</div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {grades.map(g => (
              <button
                key={tabKey(g)}
                onClick={() => {
                  setGid(g.grade_id);
                  setSectionId(g.section_id);
                  loadStudents(g.grade_id, g.section_id);
                }}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border cursor-pointer
                  ${selectedGradeId === g.grade_id && selectedSectionId === g.section_id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
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
                  label="Total Enrolled" value={data.students.length}
                  sub={selectedSectionId ? 'Active Division Roster' : 'Active Grade Roster'}
                  icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50"
                />
                <SummaryCard
                  label="Avg. Attendance" value={`${data.average_attendance_percent.toFixed(1)}%`}
                  sub="Classroom Presence"
                  icon={Calendar} iconColor="text-blue-600" iconBg="bg-blue-50"
                />
                <SummaryCard
                  label="Syllabus Progress" value={`${data.periods_completion_percent.toFixed(1)}%`}
                  sub={`${data.completed_students} / ${data.students.length} Students On Pace`}
                  icon={BookOpen} iconColor="text-emerald-600" iconBg="bg-emerald-50"
                />
                <SummaryCard
                  label="Needs Remedial Support" value={data.behind_schedule_students}
                  sub={`${data.behind_schedule_students} Students Behind Pace`}
                  icon={AlertTriangle} iconColor="text-rose-600" iconBg="bg-rose-50"
                />
              </div>

              {/* Total Syllabus & Topic Completion Progress */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                      <BarChart2 size={16} className="text-indigo-600" /> Total Syllabus & Topic Completion Progress
                    </span>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Cumulative syllabus topic delivery and period execution rate for this grade
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                    {data.total_periods_conducted} / {data.total_periods_planned} Periods Delivered
                    <span className="text-indigo-600 font-black ml-1.5">({data.periods_completion_percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <ProgressBar value={data.periods_completion_percent} colorClass="bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="flex flex-wrap gap-3 text-[11px] font-bold pt-1">
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> {data.completed_students} On Pace / Completed
                  </span>
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                    <RefreshCw size={11} /> {data.in_progress_students} In Progress
                  </span>
                  <span 
                    title="Students requiring extra guidance or behind expected topic delivery pace"
                    className="text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full flex items-center gap-1 cursor-help"
                  >
                    <AlertTriangle size={11} /> {data.behind_schedule_students} Behind Schedule (Needs Attention)
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name or roll no..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Velocity Filter:</span>
                  <div className="flex gap-1">
                    {(['All', 'NeedsAttention', 'Fast', 'Average'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setVelocityFilter(v)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                          velocityFilter === v
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {v === 'NeedsAttention' ? 'Needs Attention' : v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student table */}
              {filteredStudents.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-400">
                  <Users size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm font-bold">
                    {searchQuery || velocityFilter !== 'All'
                      ? 'No students match the selected filter criteria.'
                      : 'No students found in this grade.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student Name</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Grade & Division</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Learning Velocity</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] min-w-[130px]">Attendance</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] min-w-[130px]">Course Progress</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Module / Topic</th>
                          <th className="text-center px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Weak Topics</th>
                          <th className="text-left px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Last Active</th>
                          <th className="px-4 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const currentTab = grades.find(g => g.grade_id === selectedGradeId && g.section_id === selectedSectionId);
                          return filteredStudents.map(s => (
                            <StudentRow
                              key={s.student_id}
                              student={s}
                              fallbackGradeName={data.grade_name}
                              fallbackSectionName={currentTab?.section_name}
                              onViewWeakness={handleViewWeakness}
                            />
                          ));
                        })()}
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
