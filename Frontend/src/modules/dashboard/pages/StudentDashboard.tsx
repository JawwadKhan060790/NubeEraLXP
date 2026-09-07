import ConfirmModal from '@/components/ConfirmModal';
import StatGridCards, { SkeletonStatGrid } from '@/components/StatGrid';
import {
  CHART_COLORS,
  DashboardAreaChart, DashboardBarChart, DashboardPieChart
} from '@/components/dashboard/ChartKit';
import {
  DashboardChartCard,
  DashboardPageShell,
  DashboardWidgetCard,
  EmptyState,
  SectionHeader,
  StatGrid,
  WelcomeBanner
} from '@/components/dashboard/DashboardKit';
import { useConfirm } from '@/hooks/useConfirm';
import type { StudentAnalytics } from '@/services/analyticsService';
import { analyticsService } from '@/services/analyticsService';
import api from '@/services/api';
import type { RatableTeacher } from '@/services/teacherRatingService';
import { teacherRatingService } from '@/services/teacherRatingService';
import {
  Activity,
  Award,
  BarChart2,
  Bookmark,
  BookOpen,
  CheckCircle, Clock, GraduationCap,
  MessageSquare,
  PieChart as PieIcon,
  PlayCircle,
  Shield,
  Star,
  Target,
  TrendingUp, X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface StudentModuleProgress {
  module_id: string;
  module_name: string;
  total_lessons: number;
  completed_lessons: number;
  pending_lessons: number;
  completion_percentage: number;
}

interface RecentCompletion {
  lesson_name: string;
  module_name: string;
  completed_at: string;
}

interface FailedUnit {
  module_id: string;
  module_name: string;
  lesson_id?: string;
  lesson_name?: string;
  exam_title: string;
  obtained_marks: number;
  total_marks: number;
  passing_marks: number;
}

interface PassedUnit {
  module_id: string;
  module_name: string;
  lesson_id?: string;
  lesson_name?: string;
  exam_title: string;
  obtained_marks: number;
  total_marks: number;
  passing_marks: number;
}

interface ExamResult {
  exam_id: string;
  obtained_marks: number;
  passing_marks: number;
  is_passed: boolean;
}

interface StudentDashboardData {
  student_name: string;
  grade_name: string;
  school_name: string;
  section_code?: string;
  section_name?: string;
  student_id: string;
  roll_no: string;
  grade_id?: string;
  total_modules: number;
  total_lessons: number;
  completed_lessons: number;
  pending_lessons: number;
  syllabus_completion_percentage: number;
  attendance_rate: number;
  total_exams: number;
  average_exam_score: number;
  modules_progress: StudentModuleProgress[];
  recent_completions: RecentCompletion[];
  failed_units: FailedUnit[];
  passed_units: PassedUnit[];
  exam_results: ExamResult[];
}

const StudentDashboard: React.FC = () => {
  const [rawData, setRawData] = useState<StudentDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { confirmState, requestConfirm } = useConfirm();

  const data = React.useMemo(() => {
    if (!rawData) return null;
    let filteredCompletions = rawData.recent_completions;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filteredCompletions = filteredCompletions.filter(c => new Date(c.completed_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredCompletions = filteredCompletions.filter(c => new Date(c.completed_at) <= end);
    }

    return {
      ...rawData,
      recent_completions: filteredCompletions
    };
  }, [rawData, startDate, endDate]);

  // MCQ Interactive Exam States
  const [exams, setExams] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Teacher Rating widget state
  const [myTeachers, setMyTeachers] = useState<RatableTeacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
    fetchMyTeachers();
  }, []);

  const fetchMyTeachers = async () => {
    try {
      setTeachersLoading(true);
      const teachers = await teacherRatingService.getMyTeachers();
      setMyTeachers(teachers);
      setRatingDrafts(prev => {
        const next = { ...prev };
        teachers.forEach(t => {
          if (!next[t.teacher_id]) {
            next[t.teacher_id] = { rating: t.my_rating ?? 0, comment: t.my_comment ?? '' };
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to fetch ratable teachers', error);
    } finally {
      setTeachersLoading(false);
    }
  };

  const handleStarClick = (teacherId: string, value: number) => {
    setRatingDrafts(prev => ({
      ...prev,
      [teacherId]: { ...(prev[teacherId] ?? { rating: 0, comment: '' }), rating: value }
    }));
  };

  const handleCommentChange = (teacherId: string, value: string) => {
    setRatingDrafts(prev => ({
      ...prev,
      [teacherId]: { ...(prev[teacherId] ?? { rating: 0, comment: '' }), comment: value }
    }));
  };

  const handleSubmitRating = async (teacherId: string) => {
    const draft = ratingDrafts[teacherId];
    if (!draft || draft.rating < 1) {
      toast.error('Please select at least 1 star before submitting.');
      return;
    }
    setRatingSubmitting(teacherId);
    try {
      await teacherRatingService.submitRating(teacherId, draft.rating, draft.comment || undefined);
      toast.success('Thanks for your feedback!');
      fetchMyTeachers();
    } catch (error) {
      console.error('Failed to submit teacher rating', error);
      toast.error('Could not submit your rating. Please try again.');
    } finally {
      setRatingSubmitting(null);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await analyticsService.getStudent();
      setAnalytics(data);
    } catch (err) {
      console.error('Student analytics fetch failed:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/student');
      setRawData(response.data);
      const examsResponse = await api.get('/exams');
      setExams(examsResponse.data);
    } catch (error: any) {
      console.error('Failed to fetch student dashboard data', error);
      // 404 = no linked Student profile yet — an expected empty-state, not an error
      // worth alarming the user about (the EmptyState block below handles display).
      if (error?.response?.status !== 404) {
        toast.error('Failed to load dashboard metrics.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFailedUnitClick = async (unit: FailedUnit) => {
    if (!unit.lesson_id) return;
    try {
      await api.delete(`/lessons/${unit.lesson_id}/complete`);
      toast.success("Topic marked as incomplete. Redirecting to study material...");
      navigate(`/student/learning?lessonId=${unit.lesson_id}`);
    } catch (error) {
      console.error('Error marking unit as incomplete', error);
      toast.error("Could not process your request.");
    }
  };

  const handleStartTest = async (exam: any) => {
    setLoading(true);
    try {
      const response = await api.get('/questions');
      const examQuestions = response.data.filter((q: any) => q.exam_id === exam.id);
      if (examQuestions.length === 0) {
        toast.error("This exam doesn't have any questions configured yet.");
        return;
      }
      setActiveTest(exam);
      setTestQuestions(examQuestions);
      setAnswers({});
      setTestResult(null);
    } catch (error) {
      console.error('Failed to fetch questions', error);
      toast.error('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitTest = async () => {
    if (Object.keys(answers).length < testQuestions.length) {
      const ok = await requestConfirm({
        title: 'Unanswered Questions',
        message: 'You have not answered all questions. Submit anyway?',
        variant: 'warning',
        confirmLabel: 'Submit Anyway'
      });
      if (!ok) return;
    }

    setTestSubmitting(true);
    try {
      const submission = {
        answers: Object.keys(answers).map(qId => ({
          question_id: qId,
          selected_option: answers[qId]
        }))
      };
      const response = await api.post(`/exams/${activeTest.id}/submit`, submission);
      setTestResult(response.data);
      toast.success('Exam graded successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to submit test', error);
      toast.error('Error submitting exam answers.');
    } finally {
      setTestSubmitting(false);
    }
  };

  // ── Chart data mapping (snake_case API → PascalCase ChartKit) ──────────────
  const performanceTrend = (analytics?.performance_trend ?? []).map(d => ({ Month: d.month, Value: d.value }));
  const attendanceTrend = (analytics?.attendance_trend ?? []).map(d => ({ Month: d.month, Value: d.value }));
  const achievementGrowth = (analytics?.achievement_growth ?? []).map(d => ({ Month: d.month, Value: d.value }));
  const subjectPerf = (analytics?.subject_performance ?? []).map(d => ({ Label: d.label, Value: d.value }));
  const learningProgress = (analytics?.learning_progress ?? []).map(d => ({ Label: d.label, Value: d.value }));
  const passFail = (analytics?.pass_fail_pie ?? []).map(d => ({ Label: d.label, Value: d.value }));

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardPageShell>
        <div className="h-8 w-48 bg-slate-100 dark:bg-[#283548] rounded-full animate-pulse" />
        <StatGrid cols={4}>
          <SkeletonStatGrid count={4} />
        </StatGrid>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 bg-slate-100 dark:bg-[#283548] rounded-2xl animate-pulse" />
          <div className="lg:col-span-5 h-72 bg-slate-100 dark:bg-[#283548] rounded-2xl animate-pulse" />
        </div>
      </DashboardPageShell>
    );
  }

  // The backend now returns 404 (instead of an empty 200) when no Student profile
  // is linked to the current account. Show an explicit empty-state instead of
  // crashing on `data.student_name` etc. below — this was the actual cause of the
  // "student dashboard is not showing" report (a silent render crash).
  if (!data) {
    return (
      <DashboardPageShell>
        <EmptyState
          icon={<GraduationCap className="w-7 h-7" />}
          title="No student profile found"
          description="We couldn't find a student profile linked to your account yet. Please contact your school administrator."
        />
      </DashboardPageShell>
    );
  }

  // ── MCQ Modal (unchanged) ───────────────────────────────────────────────────
  const mcqModal = activeTest && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-3xl rounded-2xl shadow-2xl border-slate-100 dark:border-[#283548] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-50 dark:bg-[#283548] border-b border-slate-200 dark:border-[#334155] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full tracking-wider">Unit Test</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight pt-1">{activeTest.title || 'Unit Test'}</h3>
          </div>
          {!testResult && (
            <button
              onClick={async () => {
                const ok = await requestConfirm({
                  title: 'Cancel Test',
                  message: 'Are you sure you want to cancel the test? Progress will be lost.',
                  variant: 'danger',
                  confirmLabel: 'Yes, Cancel Test'
                });
                if (ok) setActiveTest(null);
              }}
              className="text-xs font-bold text-slate-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1] tracking-widest cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {testResult ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${testResult.passed ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 animate-bounce'}`}>
                <Award className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {testResult.passed ? '🎉 Congratulations! You Passed!' : '⚠️ Learning Focus Needed'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold tracking-wider">Unit test evaluation completed successfully</p>
              </div>
              <div className="bg-slate-50 dark:bg-[#283548] rounded-2xl p-6 border-slate-100 dark:border-[#334155] w-full max-w-sm grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold tracking-wider">Obtained score</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-[#e2e8f0] pt-1">{testResult.obtained_marks} / {testResult.total_marks}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold tracking-wider">Letter grade</span>
                  <span className={`text-3xl font-black pt-1 ${testResult.passed ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{testResult.grade}</span>
                </div>
              </div>
              {!testResult.passed && (
                <p className="text-xs text-rose-600 dark:text-rose-300 font-bold max-w-md bg-rose-50 dark:bg-rose-500/15 border-rose-100 dark:border-rose-400/20 px-4 py-2.5 rounded-xl">
                  Weak area identified in this unit. Your teacher and parent have been notified to assist you in this topic.
                </p>
              )}
              <button
                onClick={() => setActiveTest(null)}
                className="bg-primary text-white hover:bg-primary/95 px-8 py-3 rounded-xl font-black text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Done & Close
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {testQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-4 p-5 bg-slate-50/50 dark:bg-[#283548]/50 hover:bg-slate-50 dark:hover:bg-[#283548] rounded-2xl border-slate-100 dark:border-[#334155] transition-all">
                  <h4 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-sm md:text-base flex gap-2">
                    <span className="text-primary font-black">Q{idx + 1}.</span>
                    {q.question_text}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {[
                      { key: 'A', text: q.option_a }, { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c }, { key: 'D', text: q.option_d }
                    ].map((opt) => {
                      const isSelected = answers[q.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectOption(q.id, opt.key)}
                          className={`p-4 rounded-xl text-left flex items-start gap-3 transition-all cursor-pointer border ${isSelected
                              ? 'bg-primary/5 border-primary text-primary font-extrabold shadow-sm'
                              : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:border-slate-300 dark:hover:border-[#475569]'
                            }`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-[#475569] text-slate-400 dark:text-[#64748b]'
                            }`}>{opt.key}</span>
                          <span className="text-xs md:text-sm font-medium">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!testResult && (
          <div className="p-6 bg-slate-50 dark:bg-[#283548] border-t border-slate-200 dark:border-[#334155] flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">
              Answered: {Object.keys(answers).length} / {testQuestions.length} questions
            </span>
            <button
              onClick={handleSubmitTest}
              disabled={testSubmitting}
              className="bg-primary text-white hover:bg-primary/95 disabled:bg-slate-300 px-6 py-3 rounded-xl font-black text-xs tracking-wider shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              {testSubmitting ? 'Grading test...' : 'Submit answers'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Empty profile state ─────────────────────────────────────────────────────
  if (!data) {
    return (
      <>
        {mcqModal}
        <DashboardPageShell>
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="No Associated Student Profile"
            description="We couldn't load your student profile statistics. Please ensure the school has registered your student profile correctly in the database."
          />
        </DashboardPageShell>
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title ?? ''}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          variant={confirmState.variant}
          onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => { }}
          onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => { }}
        />
      </>
    );
  }

  // ── Date/Time filter selector ───────────────────────────────────────────────────
  const datetimeFilter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
      <div className="flex flex-col gap-1">
        <label className="text-[9px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest ml-1">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-[#475569] transition-all focus:ring-2 focus:ring-primary/20 shadow-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[9px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest ml-1">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-[#475569] transition-all focus:ring-2 focus:ring-primary/20 shadow-sm"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#283548] dark:hover:bg-[#334155] text-slate-600 dark:text-[#cbd5e1] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center border border-slate-200 dark:border-[#334155] cursor-pointer"
          title="Clear Filter"
        >
          Clear
        </button>
      )}
    </div>
  );

  const studentGradeName = (data.grade_name || '').toLowerCase().trim();
  const studentExams = exams.filter((e: any) =>
    (e.grade_name || '').toLowerCase().trim() === studentGradeName
  );

  const pendingExams = studentExams.filter((exam: any) =>
    new Date(exam.date) > new Date() && (!data.exam_results || !data.exam_results.find(r => r.exam_id === exam.id))
  );

  return (
    <>
      {mcqModal}

      <DashboardPageShell>

        {/* Welcome Banner */}
        <WelcomeBanner
          badge="Active Student"
          badgeColor="indigo"
          title={`Hi, ${data.student_name}!`}
          subtitle={`${data.school_name}  ·  ${data.section_name ? (/^(section|division)/i.test(data.section_name) ? `${data.grade_name} - ${data.section_name}` : `${data.grade_name} - Division ${data.section_name}`) : (data.section_code ? `${data.grade_name} - Division ${data.section_code}` : data.grade_name)}  —  See your year-round learning achievements, pending lessons, and exam scores.`}
          actions={datetimeFilter}
        />

        {/* Exam Announcements */}
        {pendingExams.length > 0 && (
          <div className="space-y-3">
            {pendingExams.map((exam: any) => (
              <div key={exam.id} className="bg-amber-50/90 dark:bg-amber-500/10 border-l-4 border-amber-500 border border-amber-200/60 dark:border-amber-400/25 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 animate-bounce pt-0.5">🔔</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 tracking-widest">New test announced!</h4>
                    <p className="text-xs text-amber-900 dark:text-amber-200 font-extrabold">"{exam.title}" has been announced for your grade level!</p>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70 font-semibold tracking-wider">
                      Scheduled: {new Date(exam.date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartTest(exam)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[4px] text-[10px] font-black tracking-widest transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  Take test now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards — Row 1: Units, Topics & Progress */}
        <StatGrid cols={4}>
          <StatGridCards stats={[
            { title: 'Total Units', value: analytics?.total_modules ?? data.total_modules, icon: <Bookmark className="w-5 h-5" />, color: 'sky', subtitle: 'Assigned curriculum units' },
            { title: 'Total Topics', value: analytics?.total_lessons ?? data.total_lessons ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'indigo', subtitle: 'All curriculum topics' },
            { title: 'Completed Topics', value: analytics?.completed_lessons ?? data.completed_lessons, icon: <CheckCircle className="w-5 h-5" />, color: 'emerald', subtitle: 'Finished topics so far' },
            { title: 'Course Completion', value: `${analytics?.syllabus_completion ?? data.syllabus_completion_percentage ?? 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'purple', subtitle: 'Curriculum coverage' },
          ]} />
        </StatGrid>

        {/* KPI Cards — Row 2: Attendance & Exam Analytics */}
        <StatGrid cols={4}>
          <StatGridCards stats={[
            { title: 'Attendance Rate', value: `${analytics?.attendance_rate ?? data.attendance_rate ?? 0}%`, icon: <Activity className="w-5 h-5" />, color: 'teal', subtitle: 'Year to date attendance' },
            { title: 'Total Exams', value: analytics?.total_exams ?? data.total_exams, icon: <Clock className="w-5 h-5" />, color: 'amber', subtitle: 'Taken to date' },
            { title: 'Avg Exam Score', value: `${analytics?.average_score ?? data.average_exam_score}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'indigo', subtitle: 'Overall score average' },
            { title: 'Exams Passed', value: analytics?.exams_passed ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'emerald', subtitle: 'Exams cleared' },
          ]} />
        </StatGrid>

        {/* Charts Row 1 — Performance Trend + Pass/Fail Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <DashboardChartCard
            className="lg:col-span-7"
            title="Student Progress Trend"
            icon={<TrendingUp className="w-4.5 h-4.5 text-emerald-500" />}
            badge="Monthly Avg Score"
            badgeVariant="emerald"
          >
            <DashboardAreaChart
              data={performanceTrend}
              color={CHART_COLORS[1]}
              height={220}
              loading={analyticsLoading}
              suffix="%"
            />
          </DashboardChartCard>

          <DashboardChartCard
            className="lg:col-span-5"
            title="Exam Pass / Fail Distribution"
            icon={<PieIcon className="w-4.5 h-4.5 text-blue-600" />}
            badge="All Time"
            badgeVariant="blue"
          >
            <DashboardPieChart
              data={passFail}
              height={220}
              loading={analyticsLoading}
              colors={[CHART_COLORS[1], CHART_COLORS[8]]}
            />
          </DashboardChartCard>

        </div>

        {/* Charts Row 2 — Subject Performance + Attendance Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <DashboardChartCard
            className="lg:col-span-6"
            title="Progress by Subject"
            icon={<BarChart2 className="w-4.5 h-4.5 text-amber-600" />}
            badge="Avg Score by Subject"
            badgeVariant="amber"
          >
            <DashboardBarChart
              data={subjectPerf}
              color={CHART_COLORS[2]}
              height={220}
              loading={analyticsLoading}
              suffix="%"
              colorful
            />
          </DashboardChartCard>

          <DashboardChartCard
            className="lg:col-span-6"
            title="Attendance Progress"
            icon={<Activity className="w-4.5 h-4.5 text-teal-600" />}
            badge="Monthly"
            badgeVariant="teal"
          >
            <DashboardAreaChart
              data={attendanceTrend}
              color={CHART_COLORS[5]}
              height={220}
              loading={analyticsLoading}
              suffix="%"
            />
          </DashboardChartCard>

        </div>

        {/* Charts Row 3 — Learning Progress + Achievement Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <DashboardChartCard
            className="lg:col-span-5"
            title="Learning Progress by Unit"
            icon={<PieIcon className="w-4.5 h-4.5 text-violet-600" />}
            badge="Completion %"
            badgeVariant="violet"
          >
            <DashboardPieChart
              data={learningProgress}
              height={220}
              loading={analyticsLoading}
            />
          </DashboardChartCard>

          <DashboardChartCard
            className="lg:col-span-7"
            title="Monthly Achievement Growth"
            icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-600" />}
            badge="Score Trend"
            badgeVariant="primary"
          >
            <DashboardAreaChart
              data={achievementGrowth}
              color={CHART_COLORS[0]}
              height={220}
              loading={analyticsLoading}
              suffix="%"
            />
          </DashboardChartCard>

        </div>

        {/* Weak / Focus Areas */}
        {data.failed_units && data.failed_units.length > 0 && (
          <DashboardWidgetCard noPadding className="border-rose-100 dark:border-rose-400/20">
            <div className="flex items-center gap-2 p-6 border-b border-rose-100 dark:border-rose-400/20 bg-rose-50/60 dark:bg-rose-500/10 rounded-t-2xl">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-300">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-rose-900 dark:text-rose-300 tracking-tight text-sm">⚠️ Areas needing attention</h3>
                <p className="text-[10px] text-rose-500 dark:text-rose-400/80 font-semibold tracking-wider mt-0.5">Please review these units. Scoring below passing marks has triggered extra attention.</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-rose-200">
                {data.failed_units.map((unit, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleFailedUnitClick(unit)}
                    className={`min-w-[280px] sm:min-w-[320px] snap-start bg-white dark:bg-[#1e293b] border border-rose-100 dark:border-rose-400/20 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all ${unit.lesson_id ? 'cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-black text-rose-500 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2.5 py-0.5 rounded-full tracking-wider block w-fit truncate max-w-full">
                        {unit.module_name}{unit.lesson_name ? ` - ${unit.lesson_name}` : ''}
                      </span>
                      <h4 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-sm pt-1.5 line-clamp-1">{unit.exam_title}</h4>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-[#283548] mt-3 text-xs">
                      <span className="font-bold text-slate-400 dark:text-[#64748b]">Score: <strong className="text-rose-600 dark:text-rose-300 font-black">{unit.obtained_marks}</strong> / {unit.total_marks}</span>
                      <span className="text-[10px] bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 font-black px-2 py-0.5 rounded border border-rose-100 dark:border-rose-400/20 tracking-widest">Passing: {unit.passing_marks}</span>
                    </div>
                    {unit.lesson_id && (
                      <div className="absolute top-4 right-4 opacity-50 text-rose-500">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DashboardWidgetCard>
        )}

        {/* Passed Units */}
        {data.passed_units && data.passed_units.length > 0 && (
          <DashboardWidgetCard noPadding className="border-emerald-100 dark:border-emerald-400/20">
            <div className="flex items-center gap-2 p-6 border-b border-emerald-100 dark:border-emerald-400/20 bg-emerald-50/60 dark:bg-emerald-500/10 rounded-t-2xl">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-emerald-900 dark:text-emerald-300 tracking-tight text-sm">🏆 Completed Units</h3>
                <p className="text-[10px] text-emerald-500 dark:text-emerald-400/80 font-semibold tracking-wider mt-0.5">Great job! You have successfully cleared these units with passing marks.</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-emerald-200">
                {data.passed_units.map((unit, idx) => (
                  <div
                    key={idx}
                    className="min-w-[280px] sm:min-w-[320px] snap-start bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-400/25 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all"
                  >
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full tracking-wider block w-fit truncate max-w-full">
                        {unit.module_name}{unit.lesson_name ? ` - ${unit.lesson_name}` : ''}
                      </span>
                      <h4 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-sm pt-1.5 line-clamp-1">{unit.exam_title}</h4>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-[#283548] mt-3 text-xs">
                      <span className="font-bold text-slate-400 dark:text-[#64748b]">Score: <strong className="text-emerald-600 dark:text-emerald-300 font-black">{unit.obtained_marks}</strong> / {unit.total_marks}</span>
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-black px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-400/20 tracking-widest">Passing: {unit.passing_marks}</span>
                    </div>
                    <div className="absolute top-4 right-4 text-emerald-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardWidgetCard>
        )}

        {/* Exam Assessment Center */}
        <DashboardWidgetCard noPadding>
          <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-lg">📝 Unit Test Center</h3>
              <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-semibold tracking-wider mt-0.5">Quizzes & auto-graded unit tests</p>
            </div>
            {exams.filter(e => e.grade_id === data.grade_id).some(e => !data.exam_results?.find(r => r.exam_id === e.id)) && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 rounded-full tracking-wider animate-pulse">Active tests</span>
            )}
          </div>

          <div className="p-6 md:p-8">
            {exams.filter(e => e.grade_id === data.grade_id).length === 0 ? (
              <EmptyState title="No active tests set up for your grade." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.filter(e => e.grade_id === data.grade_id).map((exam) => {
                  const result = data.exam_results?.find(r => r.exam_id === exam.id);
                  const isPassed = result?.is_passed;
                  return (
                    <div key={exam.id} className={`${isPassed ? 'bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-400/25' : 'bg-slate-50/50 dark:bg-[#283548]/50 hover:bg-slate-50 dark:hover:bg-[#283548] border-slate-200 dark:border-[#334155]'} rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden border`}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full tracking-wider ${isPassed ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-200 dark:bg-emerald-500/20' : 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15'}`}>{exam.module_name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold">Passing: {exam.passing_marks ?? Math.ceil((exam.total_marks || exam.question_count || 100) * 0.40)}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-sm md:text-base pt-1">{exam.title || 'Unit Test'}</h4>
                        <div className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold tracking-wider flex flex-wrap gap-x-4 gap-y-1">
                          <span>Questions: {exam.question_count}</span>
                          <span>Total marks: {exam.total_marks || exam.question_count}</span>
                          {exam.duration_minutes && <span>Duration: {exam.duration_minutes} mins</span>}
                        </div>
                      </div>
                      <div className="pt-5 border-t border-slate-200 dark:border-[#334155] mt-4 flex items-center justify-between gap-4">
                        {isPassed ? (
                          <div className="flex-1 bg-emerald-500 text-white shadow-sm text-center py-2.5 rounded-xl font-black text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-default">
                            <CheckCircle className="w-4 h-4" /> Passed
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartTest(exam)}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-center py-2.5 rounded-xl font-black text-xs tracking-wider transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4" /> {result && !isPassed ? 'Restart Test' : 'Start test'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardWidgetCard>

        {/* Rate Your Teachers */}
        <DashboardWidgetCard noPadding>
          <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-lg">⭐ Rate Your Teachers</h3>
              <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-semibold tracking-wider mt-0.5">Share quick feedback on the teachers who teach your grade</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {teachersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-[#283548]/50 animate-pulse" />
                ))}
              </div>
            ) : myTeachers.length === 0 ? (
              <EmptyState title="No teachers available to rate yet." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTeachers.map((teacher) => {
                  const draft = ratingDrafts[teacher.teacher_id] ?? { rating: teacher.my_rating ?? 0, comment: teacher.my_comment ?? '' };
                  const alreadyRated = !!teacher.my_rating;
                  const isSubmitting = ratingSubmitting === teacher.teacher_id;
                  return (
                    <div key={teacher.teacher_id} className="bg-slate-50/50 dark:bg-[#283548]/50 border border-slate-200 dark:border-[#334155] rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {teacher.subject && (
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15 px-2.5 py-0.5 rounded-full tracking-wider truncate max-w-full">
                              {teacher.subject}
                            </span>
                          )}
                          {teacher.is_class_teacher && (
                            <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2.5 py-0.5 rounded-full tracking-wider shrink-0">
                              Class Teacher
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-sm pt-1">{teacher.teacher_name}</h4>

                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleStarClick(teacher.teacher_id, star)}
                              className="cursor-pointer hover:scale-110 transition-transform"
                              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <Star
                                className={`w-5 h-5 ${star <= draft.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-[#475569]'}`}
                              />
                            </button>
                          ))}
                        </div>

                        <div className="flex items-start gap-1.5 pt-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] mt-1.5 shrink-0" />
                          <textarea
                            value={draft.comment}
                            onChange={(e) => handleCommentChange(teacher.teacher_id, e.target.value)}
                            placeholder="Optional comment..."
                            rows={2}
                            className="w-full text-xs bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-slate-700 dark:text-[#cbd5e1]"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-[#334155] flex items-center justify-between gap-3">
                        {alreadyRated && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold tracking-wider shrink-0">
                            Your rating: {teacher.my_rating}★
                          </span>
                        )}
                        <button
                          onClick={() => handleSubmitRating(teacher.teacher_id)}
                          disabled={isSubmitting || draft.rating < 1}
                          className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-center py-2 rounded-xl font-black text-xs tracking-wider transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                        >
                          {isSubmitting ? 'Saving...' : alreadyRated ? 'Update Rating' : 'Submit Rating'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardWidgetCard>

        {/* Year-Round Progress + Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Module Progress */}
          <DashboardWidgetCard noPadding className="lg:col-span-8">
            <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-base">Year-Round Progress</h3>
                <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-semibold tracking-wider mt-0.5">Unit completion dashboard</p>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wider">Interactive map</span>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              {data.modules_progress.length === 0 ? (
                <EmptyState title="No active units configured for this grade." />
              ) : (
                data.modules_progress
                  .slice()
                  .sort((a, b) => {
                    const getUnitNum = (name: string) => {
                      if (!name) return 999;
                      const match = name.match(/\d+/);
                      return match ? parseInt(match[0], 10) : 999;
                    };
                    const numA = getUnitNum(a.module_name);
                    const numB = getUnitNum(b.module_name);
                    if (numA !== numB) return numA - numB;
                    return a.module_name.localeCompare(b.module_name);
                  })
                  .map((module) => {
                  const isFullyDone = module.completion_percentage === 100;
                  return (
                    <div key={module.module_id} className="space-y-3 p-5 bg-slate-50/40 dark:bg-[#283548]/40 hover:bg-white dark:hover:bg-[#1e293b] rounded-[10px] shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <span className="font-black text-slate-800 dark:text-[#e2e8f0] text-sm flex items-center gap-1.5">
                            {module.module_name}
                            {isFullyDone && <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />}
                          </span>
                          <div className="text-[10px] text-slate-400 dark:text-[#64748b] font-extrabold tracking-wider flex items-center gap-3">
                            <span>Total: {module.total_lessons}</span>
                            <span className="text-emerald-600">Completed: {module.completed_lessons}</span>
                            <span className="text-amber-600">Pending: {module.pending_lessons}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-[4px] shrink-0 ${isFullyDone ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-[#283548] text-slate-600 dark:text-[#cbd5e1]'}`}>
                          {module.completion_percentage}% Completed
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 dark:bg-[#334155]/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ease-out rounded-full ${isFullyDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-primary'}`}
                          style={{ width: `${module.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DashboardWidgetCard>

          {/* Sidebar: Milestones + Study Center */}
          <div className="lg:col-span-4 space-y-5">

            {/* Recent Milestones */}
            <DashboardWidgetCard noPadding>
              <div className="p-5 border-b border-slate-100 dark:border-[#283548]">
                <SectionHeader title="Recent Milestones" icon={<Award className="w-4 h-4" />} />
              </div>
              <div className="p-5">
                {data.recent_completions.length === 0 ? (
                  <EmptyState title="No recent milestones. Start learning today!" />
                ) : (
                  <div className="relative border-l-2 border-emerald-100 dark:border-emerald-400/20 pl-5 space-y-6 ml-2">
                    {data.recent_completions.map((completion, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1e293b] ring-4 ring-emerald-500/15 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                        <div className="bg-slate-50 dark:bg-[#283548] p-3.5 rounded-[8px] hover:bg-slate-100/50 dark:hover:bg-[#334155]/50 transition-all shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-black text-slate-800 dark:text-[#e2e8f0] block leading-tight">{completion.lesson_name}</span>
                            <span className="text-[8px] font-black font-mono bg-white dark:bg-[#1e293b] border border-slate-200/55 dark:border-[#334155]/55 px-2 py-0.5 rounded text-slate-400 dark:text-[#64748b] tracking-wider shrink-0">
                              {new Date(completion.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-emerald-600 tracking-wider block pt-1.5">Unit: {completion.module_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DashboardWidgetCard>

            {/* Study Center CTA */}
            <div
              className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-855 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden space-y-4 group cursor-pointer"
              onClick={() => navigate('/student/learning')}
            >
              {/* Background decorative elements */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-28 h-28 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
              <BookOpen className="absolute -right-4 -bottom-4 w-28 h-28 text-white/5 group-hover:scale-105 group-hover:rotate-6 transition-all duration-500 pointer-events-none" />

              <div className="relative z-10 space-y-2">
                <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-white/15 border border-white/10 px-2.5 py-1 rounded-full text-indigo-100">
                  Ready to learn?
                </span>
                <h4 className="text-lg font-black tracking-tight text-white pt-1">Go to study materials</h4>
                <p className="text-[10.5px] text-indigo-100/90 font-semibold leading-relaxed max-w-[90%]">
                  Access all subject content, view fun slides, watch video tutorials, and grab helpful resources.
                </p>
              </div>

              <div className="relative z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/student/learning'); }}
                  className="w-full bg-white text-indigo-700 hover:bg-slate-50 py-3 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:shadow-md"
                >
                  <PlayCircle className="w-4 h-4 text-indigo-600" />
                  <span>Start studying now</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </DashboardPageShell>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? ''}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => { }}
        onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => { }}
      />
    </>
  );
};

export default StudentDashboard;
