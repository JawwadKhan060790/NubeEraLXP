import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, AlertTriangle, CheckCircle, PlusCircle,
  Trash2, Download, RefreshCw,
} from 'lucide-react';
import {
  generateReportCard,
  getExamResultsForStudent,
  type SubjectInput,
  type ActivityInput,
  type SkillInput,
  type ExamResultForReportCard,
} from '@/services/reportCardService';
import api from '@/services/api';
import {
  DashboardPageShell,
  DashboardWidgetCard,
} from '@/components/dashboard/DashboardKit';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXAM_TYPES       = ['Unit Test', 'Mid-Term', 'Final Exam', 'Annual Exam'];
const ACTIVITY_NAMES   = ['Sports', 'Robotics', 'Coding', 'STEM', 'Leadership', 'Discipline'];
const ACTIVITY_RATINGS = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'];
const SKILL_NAMES      = ['Communication', 'Teamwork', 'Creativity', 'Problem Solving', 'Critical Thinking', 'Behaviour'];

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const LABEL_CLS   = 'block text-xs font-bold text-slate-600 mb-1.5';
const SECTION_CLS = 'text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptySubject  = (): SubjectInput  => ({ subject_name: '', max_marks: 100, obtained_marks: 0, remarks: '' });
const emptyActivity = (): ActivityInput => ({ activity_name: ACTIVITY_NAMES[0], rating: 'Good' });
const emptySkill    = (): SkillInput    => ({ skill_name: SKILL_NAMES[0], rating: 3 });

const pctStr   = (obt: number, max: number) => (max > 0 ? ((obt / max) * 100).toFixed(0) + '%' : '—');
const pctColor = (obt: number, max: number) => {
  if (max === 0) return 'text-slate-400';
  const p = (obt / max) * 100;
  if (p >= 80) return 'text-emerald-600';
  if (p >= 60) return 'text-blue-600';
  if (p >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

// ─── Subject row component ────────────────────────────────────────────────────
const SubjectRow: React.FC<{
  sub: SubjectInput;
  onChange: (s: SubjectInput) => void;
  onRemove: () => void;
}> = ({ sub, onChange, onRemove }) => (
  <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
    <td className="py-2 pr-2">
      <input
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        placeholder="Subject name"
        value={sub.subject_name}
        onChange={e => onChange({ ...sub, subject_name: e.target.value })}
      />
    </td>
    <td className="py-2 px-2 w-24">
      <input
        type="number" min={1} max={1000}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        value={sub.max_marks}
        onChange={e => onChange({ ...sub, max_marks: +e.target.value })}
      />
    </td>
    <td className="py-2 px-2 w-24">
      <input
        type="number" min={0} max={sub.max_marks}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        value={sub.obtained_marks}
        onChange={e => onChange({ ...sub, obtained_marks: +e.target.value })}
      />
    </td>
    <td className={`py-2 px-2 w-16 text-center text-xs font-black ${pctColor(sub.obtained_marks, sub.max_marks)}`}>
      {pctStr(sub.obtained_marks, sub.max_marks)}
    </td>
    <td className="py-2 pl-2">
      <input
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        placeholder="Remarks (optional)"
        value={sub.remarks ?? ''}
        onChange={e => onChange({ ...sub, remarks: e.target.value })}
      />
    </td>
    <td className="py-2 pl-2 w-8">
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </td>
  </tr>
);

// ─── Main component ───────────────────────────────────────────────────────────
const GenerateReportCard: React.FC = () => {
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  // Dropdown lists
  const [schools,  setSchools]  = useState<{ id: string; name: string }[]>([]);
  const [grades,   setGrades]   = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; studentIdNumber: string }[]>([]);

  // Core selectors
  const [schoolId,  setSchoolId]  = useState(localStorage.getItem('nubeera_selected_school_id') || '');
  const [gradeId,   setGradeId]   = useState('');
  const [studentId, setStudentId] = useState('');

  // Exam metadata
  const [academicYear,     setAcademicYear]     = useState('2025-2026');
  const [examType,         setExamType]         = useState('Final Exam');
  const [examName,         setExamName]         = useState('');
  const [examDate,         setExamDate]         = useState('');
  const [workingDays,      setWorkingDays]      = useState('');
  const [daysPresent,      setDaysPresent]      = useState('');
  const [teacherRemarks,   setTeacherRemarks]   = useState('');
  const [principalRemarks, setPrincipalRemarks] = useState('');

  // Subject / activity / skill lists
  const [subjects,   setSubjects]   = useState<SubjectInput[]>([emptySubject()]);
  const [activities, setActivities] = useState<ActivityInput[]>([]);
  const [skills,     setSkills]     = useState<SkillInput[]>([]);

  // Tracks whether subjects were auto-filled from the API
  const [resultsLoaded, setResultsLoaded] = useState(false);

  // ── Fetch lookup data ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/schools').then(r => {
      const list: { id: string; name: string }[] = r.data ?? [];
      setSchools(list);
      if (!schoolId && list.length === 1) setSchoolId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (schoolId) {
      api.get(`/grades/by-school/${schoolId}`).then(r => setGrades(r.data ?? [])).catch(() => {});
    } else {
      setGrades([]);
    }
    setGradeId(''); setStudentId('');
    setSubjects([emptySubject()]); setResultsLoaded(false);
  }, [schoolId]);

  useEffect(() => {
    if (gradeId && schoolId) {
      api.get('/students', { params: { schoolId, gradeId, pageSize: 200 } })
        .then(r => setStudents(r.data?.items ?? []))
        .catch(() => {});
    } else {
      setStudents([]);
    }
    setStudentId(''); setSubjects([emptySubject()]); setResultsLoaded(false);
  }, [gradeId, schoolId]);

  // ── Auto-fetch exam results for this student/grade ─────────────────────────
  const fetchResults = async () => {
    if (!studentId || !gradeId) { setError('Select a student and grade first.'); return; }
    setFetching(true); setError('');
    try {
      const data: ExamResultForReportCard[] = await getExamResultsForStudent(studentId, gradeId);
      if (data.length === 0) {
        setError('No published exam results found. Enter subjects manually below.');
        setResultsLoaded(false);
        return;
      }
      setSubjects(data.map(r => ({
        subject_name:   r.subject_name,
        max_marks:      r.max_marks,
        obtained_marks: r.obtained_marks,
        remarks:        r.remarks ?? '',
      })));
      setResultsLoaded(true);
    } catch {
      setError('Failed to fetch exam results. Enter subjects manually.');
    } finally {
      setFetching(false);
    }
  };

  // ── Subject helpers ────────────────────────────────────────────────────────
  const updateSubject = (i: number, sub: SubjectInput) =>
    setSubjects(prev => prev.map((s, idx) => idx === i ? sub : s));
  const removeSubject = (i: number) => {
    setSubjects(prev => prev.filter((_, idx) => idx !== i));
    setResultsLoaded(false);
  };

  // ── Running totals ─────────────────────────────────────────────────────────
  const totalMax = subjects.reduce((s, r) => s + r.max_marks, 0);
  const totalObt = subjects.reduce((s, r) => s + r.obtained_marks, 0);
  const totalPct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '—';

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!studentId || !schoolId || !gradeId || !academicYear || !examType) {
      setError('Please fill all required fields (*).'); return;
    }
    if (subjects.length === 0 || subjects.some(s => !s.subject_name.trim())) {
      setError('Add at least one subject with a name.'); return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const rc = await generateReportCard({
        student_id:         studentId,
        school_id:          schoolId,
        grade_id:           gradeId,
        academic_year:      academicYear,
        exam_type:          examType,
        exam_name:          examName   || undefined,
        exam_date:          examDate   || undefined,
        total_working_days: workingDays ? +workingDays : undefined,
        days_present:       daysPresent ? +daysPresent : undefined,
        teacher_remarks:    teacherRemarks   || undefined,
        principal_remarks:  principalRemarks || undefined,
        subjects,
        activities: activities.length > 0 ? activities : undefined,
        skills:     skills.length     > 0 ? skills     : undefined,
      });
      setSuccess(`Report card ${rc.report_card_number} generated successfully!`);
      setTimeout(() => navigate('/report-cards'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Generation failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardPageShell className="max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/report-cards')}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Admin Operations
          </span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">Generate Report Card</h1>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
          <button type="button" onClick={() => setError('')} className="ml-auto text-rose-300 hover:text-rose-500">✕</button>
        </div>
      )}

      {/* ── Target (school / grade / student) ─────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-5">
          <h2 className={SECTION_CLS}>Target</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>School campus *</label>
              <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={INPUT_CLS}>
                <option value="">Select school…</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Grade level *</label>
              <select value={gradeId} onChange={e => setGradeId(e.target.value)} className={INPUT_CLS} disabled={!schoolId}>
                <option value="">Select grade…</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Student *</label>
              <select
                value={studentId}
                onChange={e => { setStudentId(e.target.value); setResultsLoaded(false); }}
                className={INPUT_CLS}
                disabled={!gradeId}
              >
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentIdNumber})</option>)}
              </select>
            </div>
          </div>
        </div>
      </DashboardWidgetCard>

      {/* ── Exam metadata ──────────────────────────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-5">
          <h2 className={SECTION_CLS}>Exam Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Academic Year *</label>
              <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025-2026" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Exam Type *</label>
              <select value={examType} onChange={e => setExamType(e.target.value)} className={INPUT_CLS}>
                {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Exam Name</label>
              <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Optional label" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Exam Date</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Total Working Days</label>
              <input type="number" min={0} value={workingDays} onChange={e => setWorkingDays(e.target.value)} placeholder="e.g. 220" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Days Present</label>
              <input type="number" min={0} value={daysPresent} onChange={e => setDaysPresent(e.target.value)} placeholder="e.g. 198" className={INPUT_CLS} />
            </div>
          </div>
        </div>
      </DashboardWidgetCard>

      {/* ── Subject marks ─────────────────────────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Subject Marks *</h2>
              {resultsLoaded && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Auto-loaded
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchResults}
                disabled={!studentId || !gradeId || fetching}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fetching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {fetching ? 'Loading…' : 'Load from Exam Results'}
              </button>
              <button
                type="button"
                onClick={() => { setSubjects(prev => [...prev, emptySubject()]); setResultsLoaded(false); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              Click <strong>Load from Exam Results</strong> to auto-fill, or <strong>Add Row</strong> to enter manually.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="pb-2 text-left pr-2">Subject</th>
                    <th className="pb-2 text-right px-2 w-24">Max</th>
                    <th className="pb-2 text-right px-2 w-24">Obtained</th>
                    <th className="pb-2 text-center px-2 w-16">%</th>
                    <th className="pb-2 text-left pl-2">Remarks</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <SubjectRow
                      key={i}
                      sub={s}
                      onChange={sub => updateSubject(i, sub)}
                      onRemove={() => removeSubject(i)}
                    />
                  ))}
                </tbody>
                {subjects.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td className="pt-3 pr-2 text-xs font-black text-slate-600 uppercase tracking-wide">Total</td>
                      <td className="pt-3 px-2 text-right text-xs font-black text-slate-700">{totalMax}</td>
                      <td className="pt-3 px-2 text-right text-xs font-black text-slate-700">{totalObt}</td>
                      <td className={`pt-3 px-2 text-center text-xs font-black ${pctColor(totalObt, totalMax)}`}>{totalPct}%</td>
                      <td /><td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </DashboardWidgetCard>

      {/* ── Co-Curricular Activities ──────────────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Co-Curricular Activities{' '}
              <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
            </h2>
            <button
              type="button"
              onClick={() => setActivities(prev => [...prev, emptyActivity()])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Activity
            </button>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No activities added.</p>
          ) : (
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={a.activity_name}
                    onChange={e => setActivities(prev => prev.map((x, idx) => idx === i ? { ...x, activity_name: e.target.value } : x))}
                    className={`flex-1 ${INPUT_CLS}`}
                  >
                    {ACTIVITY_NAMES.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <select
                    value={a.rating ?? ''}
                    onChange={e => setActivities(prev => prev.map((x, idx) => idx === i ? { ...x, rating: e.target.value } : x))}
                    className={`flex-1 ${INPUT_CLS}`}
                  >
                    {ACTIVITY_RATINGS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActivities(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors border border-slate-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardWidgetCard>

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Skills{' '}
              <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
            </h2>
            <button
              type="button"
              onClick={() => setSkills(prev => [...prev, emptySkill()])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Skill
            </button>
          </div>
          {skills.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No skills added.</p>
          ) : (
            <div className="space-y-2">
              {skills.map((sk, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={sk.skill_name}
                    onChange={e => setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, skill_name: e.target.value } : x))}
                    className={`flex-1 ${INPUT_CLS}`}
                  >
                    {SKILL_NAMES.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, rating: v } : x))}
                        className={`w-7 h-7 rounded-full text-[11px] font-black border transition-colors ${
                          sk.rating >= v
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-primary/50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors border border-slate-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardWidgetCard>

      {/* ── Remarks ───────────────────────────────────────────────────────── */}
      <DashboardWidgetCard>
        <div className="space-y-4">
          <h2 className={SECTION_CLS}>Remarks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Teacher Remarks</label>
              <textarea
                rows={3}
                value={teacherRemarks}
                onChange={e => setTeacherRemarks(e.target.value)}
                placeholder="Class teacher's comments on student performance…"
                className={`${INPUT_CLS} resize-none`}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Principal Remarks</label>
              <textarea
                rows={3}
                value={principalRemarks}
                onChange={e => setPrincipalRemarks(e.target.value)}
                placeholder="Principal's remarks…"
                className={`${INPUT_CLS} resize-none`}
              />
            </div>
          </div>
        </div>
      </DashboardWidgetCard>

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-4">
        <button
          type="button"
          onClick={() => navigate('/report-cards')}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Generating…' : 'Generate Report Card'}
        </button>
      </div>

    </DashboardPageShell>
  );
};

export default GenerateReportCard;
