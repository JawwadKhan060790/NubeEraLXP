import React, { useState, useEffect } from 'react';
import {
  AlertCircle, Calendar as CalendarIcon, Check, ClipboardList, Save,
  Search, UserCheck, Users, LayoutGrid, List, ChevronDown, Building2,
  GraduationCap, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import Tabs from '@/components/Tabs';
import { useAuth } from '@/hooks';
import { ROLES } from '@/constants/roles';
import ExportButton from '@/components/export/ExportButton';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttendancePerson {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  personId: string;
  personName: string;
}
interface School { id: string; name: string; }
interface Grade  { id: string; grade_name: string; }
type Mode = 'students' | 'teachers';

const TABS = [
  { key: 'students', label: 'Students', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { key: 'teachers', label: 'Teachers', icon: <Briefcase    className="w-3.5 h-3.5" /> },
];

// ── Component ─────────────────────────────────────────────────────────────────
const UnifiedAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isPrincipal = user?.utype === ROLES.PRINCIPAL;

  const [mode, setMode] = useState<Mode>('students');

  const [schools, setSchools]               = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [grades, setGrades]                 = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId]   = useState('');
  const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().slice(0, 10));

  const [people, setPeople]   = useState<AttendancePerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('list');

  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [gradesLoading, setGradesLoading]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const todayUTC = new Date().toISOString().slice(0, 10);
  const todayLocal = new Date().toLocaleDateString('en-CA');
  const isToday = selectedDate === todayUTC || selectedDate === todayLocal;

  // ── Fetch schools once ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setSchoolsLoading(true);
        const { data } = await api.get('/schools');
        const raw = Array.isArray(data) ? data : (data.value || []);
        const mapped = raw.map((s: any) => ({ id: s.id || s.Id, name: s.name || s.Name || 'Unknown' }));
        if (isPrincipal && user?.school_id) {
          const filtered = mapped.filter((s: any) => s.id === user.school_id);
          setSchools(filtered);
          setSelectedSchoolId(user.school_id);
        } else {
          setSchools(mapped);
        }
      } catch { toast.error('Failed to load schools.'); }
      finally { setSchoolsLoading(false); }
    })();
  }, [isPrincipal, user?.school_id]);

  // ── Fetch grades when school changes (students only) ───────────────────────
  useEffect(() => {
    if (mode === 'students' && selectedSchoolId) {
      (async () => {
        try {
          setGradesLoading(true);
          const { data } = await api.get(`/grades/by-school/${selectedSchoolId}`);
          const raw = Array.isArray(data) ? data : (data.value || []);
          setGrades(raw.map((g: any) => ({
            id: g.id || g.Id,
            grade_name: g.grade_name || g.GradeName || `Grade ${g.grade_level}`,
          })));
        } catch { toast.error('Failed to load grades.'); }
        finally { setGradesLoading(false); }
      })();
    } else {
      setGrades([]);
      setSelectedGradeId('');
    }
    setPeople([]);
  }, [selectedSchoolId, mode]);

  // ── Fetch attendance list ──────────────────────────────────────────────────
  useEffect(() => {
    const canFetchStudents = mode === 'students' && selectedGradeId && selectedDate;
    const canFetchTeachers = mode === 'teachers' && selectedSchoolId && selectedDate;
    if (canFetchStudents || canFetchTeachers) {
      fetchAttendance();
    } else {
      setPeople([]);
    }
  }, [mode, selectedGradeId, selectedSchoolId, selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      let raw: any[] = [];
      if (mode === 'students') {
        const { data } = await api.get(`/attendance/students?gradeId=${selectedGradeId}&date=${selectedDate}`);
        raw = Array.isArray(data) ? data : (data.value || []);
        setPeople(raw.map((s: any) => ({
          id: s.id || s.Id || '00000000-0000-0000-0000-000000000000',
          date: s.date || selectedDate,
          status: s.status || 'Absent',
          remarks: s.remarks || null,
          personId: s.student_id || s.studentId || s.StudentId,
          personName: s.student_name || s.studentName || s.StudentName || 'Unknown',
        })));
      } else {
        const { data } = await api.get(`/attendance/teachers?date=${selectedDate}&schoolId=${selectedSchoolId}`);
        raw = Array.isArray(data) ? data : (data.value || []);
        setPeople(raw.map((t: any) => ({
          id: t.id || t.Id || '00000000-0000-0000-0000-000000000000',
          date: t.date || selectedDate,
          status: t.status || 'Present',
          remarks: t.remarks || null,
          personId: t.teacher_id || t.teacherId || t.TeacherId,
          personName: t.teacher_name || t.teacherName || t.TeacherName || 'Unknown',
        })));
      }
    } catch { toast.error(`Failed to load ${mode} attendance.`); }
    finally { setLoading(false); }
  };

  // ── Toggle / Bulk ──────────────────────────────────────────────────────────
  const toggle = (personId: string) =>
    setPeople(prev => prev.map(p =>
      p.personId === personId ? { ...p, status: p.status === 'Present' ? 'Absent' : 'Present' } : p
    ));

  const markAll = (status: 'Present' | 'Absent') => {
    setPeople(prev => prev.map(p => ({ ...p, status })));
    toast.success(`Marked all ${mode} as ${status}`);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    try {
      setSaving(true);
      if (mode === 'students') {
        const payload = people.map(p => ({
          id: p.id, date: selectedDate, status: p.status,
          remarks: p.remarks, student_id: p.personId, student_name: p.personName, teacher_id: null,
        }));
        await api.post('/attendance/save', payload,
          { headers: selectedSchoolId ? { 'X-School-Id': selectedSchoolId } : {} });
      } else {
        const payload = people.map(p => ({
          id: p.id, date: selectedDate, status: p.status,
          remarks: p.remarks, teacher_id: p.personId, teacher_name: p.personName, student_id: null,
        }));
        await api.post('/attendance/teachers/save', payload,
          { headers: { 'X-School-Id': selectedSchoolId } });
      }
      toast.success('Attendance saved successfully!');
      fetchAttendance();
    } catch { toast.error('Failed to save attendance.'); }
    finally { setSaving(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered    = people.filter(p => p.personName.toLowerCase().includes(searchTerm.toLowerCase()));
  const presentCount = people.filter(p => p.status === 'Present').length;
  const absentCount  = people.filter(p => p.status === 'Absent').length;
  const isReady = mode === 'students' ? !!selectedGradeId : !!selectedSchoolId;
  const label = mode === 'students' ? 'student' : 'teacher';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Daily Attendance Register</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Record student and teacher attendance from one place. Switch between modes using the tabs below.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <Tabs
        tabs={isPrincipal ? TABS.filter(t => t.key !== 'teachers') : TABS}
        active={mode}
        onChange={(key) => {
          setMode(key as Mode);
          setPeople([]);
          setSearchTerm('');
        }}
        variant="pills"
      />

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] rounded-2xl p-5 shadow-sm">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${mode === 'students' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-5 items-end`}>

          {/* School */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> School
            </label>
            <div className="relative">
              <select
                value={selectedSchoolId}
                onChange={e => { setSelectedSchoolId(e.target.value); setSelectedGradeId(''); }}
                disabled={schoolsLoading || isPrincipal}
                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/40 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-xl text-sm font-semibold outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                {isPrincipal ? null : <option value="">-- Select School --</option>}
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Grade (students only) */}
          {mode === 'students' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Grade / Class
              </label>
              <div className="relative">
                <select
                  value={selectedGradeId}
                  onChange={e => setSelectedGradeId(e.target.value)}
                  disabled={!selectedSchoolId || gradesLoading}
                  className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/40 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-xl text-sm font-semibold outline-none focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{!selectedSchoolId ? '-- Select School First --' : '-- Select Grade --'}</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#283548]/40 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-xl text-sm font-semibold outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Bulk Buttons */}
          {isReady && people.length > 0 && !isPrincipal && isToday && (
            <div className="flex gap-2">
              <button onClick={() => markAll('Present')}
                className="flex-1 px-3 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer">
                ✓ All Present
              </button>
              <button onClick={() => markAll('Absent')}
                className="flex-1 px-3 py-3 bg-slate-50 dark:bg-[#283548]/30 text-slate-500 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-[#283548] rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer">
                ✕ Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isReady ? (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] rounded-2xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/60 dark:bg-[#283548]/30">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder={`Search ${label}s by name…`}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-xl text-xs font-medium outline-none focus:border-primary transition-all" />
              </div>
              <div className="flex items-center bg-gray-100 dark:bg-[#283548] border border-gray-200 dark:border-[#283548] rounded-xl p-0.5 self-start sm:self-auto">
                {(['grid', 'list'] as const).map(v => (
                  <button key={v} type="button" onClick={() => setViewMode(v)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === v ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-slate-600'}`}
                    title={v === 'grid' ? 'Grid View' : 'List View'}>
                    {v === 'grid' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
              <ExportButton
                endpoint={
                  mode === 'students'
                    ? `/attendance/export/students?gradeId=${selectedGradeId}&date=${selectedDate}`
                    : `/attendance/export/teachers?date=${selectedDate}${selectedSchoolId ? `&schoolId=${selectedSchoolId}` : ''}`
                }
                fallbackFileName={
                  mode === 'students'
                    ? `student-attendance-${selectedDate}.xlsx`
                    : `teacher-attendance-${selectedDate}.xlsx`
                }
                label="Export to Excel"
              />
            </div>
            {people.length > 0 && (
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <UserCheck className="w-3.5 h-3.5" /> Present: {presentCount}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 rounded-lg border border-rose-100 dark:border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Absent: {absentCount}
                </span>
              </div>
            )}
          </div>

          {/* List Body */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Loading attendance…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-[#283548] text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-700 dark:text-white uppercase tracking-wider">
                No {label}s found
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium">
                {searchTerm ? 'No results match your search.' : `No ${label}s are enrolled under this selection.`}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(p => {
                  const isPresent = p.status === 'Present';
                  return (
                    <div key={p.personId} onClick={() => !isPrincipal && toggle(p.personId)}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 select-none relative overflow-hidden group ${
                        isPrincipal ? '' : 'cursor-pointer hover:shadow-md'
                      } ${
                        isPresent ? 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-400/60 dark:border-emerald-500/30' : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-[#283548] hover:border-gray-300'
                      }`}>
                      {isPresent && <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm uppercase transition-colors ${
                          isPresent ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-[#283548] text-slate-600 dark:text-slate-300'
                        }`}>
                          {p.personName.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white tracking-tight group-hover:text-primary transition-colors">{p.personName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            isPresent ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20'
                                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-500/20'
                          }`}>{p.status}</span>
                        </div>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); !isPrincipal && toggle(p.personId); }}
                        disabled={isPrincipal}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isPrincipal ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          isPresent ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105'
                                    : 'bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#283548] text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200'
                        }`}>
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!isPrincipal && (
                <div className="pt-6 border-t border-gray-100 dark:border-[#283548] flex justify-end">
                  <SaveButton saving={saving} onClick={save} />
                </div>
              )}
            </div>
          ) : (
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">Full Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-right px-6 py-4">Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const isPresent = p.status === 'Present';
                      return (
                        <tr key={p.personId} onClick={() => !isPrincipal && isToday && toggle(p.personId)}
                          className={`group transition-colors ${
                            isPrincipal || !isToday ? '' : 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#283548]/30'
                          }`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase ${
                                isPresent ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-[#283548] text-slate-600 dark:text-slate-300'
                              }`}>{p.personName.charAt(0)}</div>
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{p.personName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-500 font-mono">{selectedDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              isPresent ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20'
                                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-500/20'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <button type="button" onClick={() => !isPrincipal && isToday && toggle(p.personId)}
                                disabled={isPrincipal || !isToday}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isPrincipal || !isToday ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  isPresent ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15'
                                            : 'bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#283548] text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
                                }`}>
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!isPrincipal && isToday && (
                <div className="p-6 border-t border-gray-100 dark:border-[#283548] flex justify-end">
                  <SaveButton saving={saving} onClick={save} />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] border-dashed rounded-2xl p-16 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-[#283548] flex items-center justify-center mx-auto text-primary/75">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight uppercase">
            {mode === 'students' ? 'Select School & Grade to Begin' : 'Select School to Begin'}
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
            {mode === 'students'
              ? 'Choose a school and a grade to list students and record attendance.'
              : 'Choose a school from the filter above to list teachers and record attendance.'}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Save Button ────────────────────────────────────────────────────────────────
const SaveButton: React.FC<{ saving: boolean; onClick: () => void }> = ({ saving, onClick }) => (
  <button type="button" onClick={onClick} disabled={saving}
    className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-75 cursor-pointer">
    {saving
      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      : <Save className="w-4 h-4" />}
    Save Attendance
  </button>
);

export default UnifiedAttendancePage;
