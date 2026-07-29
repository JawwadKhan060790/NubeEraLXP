import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, CheckCircle, GraduationCap, School, Shield,
  TrendingUp, BarChart2, PieChart as PieIcon, Activity, Target, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { analyticsService } from '@/services/analyticsService';
import type { ParentAnalytics } from '@/services/analyticsService';
import StatGridCards, { SkeletonStatGrid } from '@/components/StatGrid';
import {
  DashboardPageShell, WelcomeBanner, StatGrid,
  DashboardChartCard, DashboardWidgetCard, SectionHeader, EmptyState
} from '@/components/dashboard/DashboardKit';
import {
  DashboardAreaChart, DashboardBarChart, DashboardPieChart,
  DashboardDualChart, SkeletonChart, CHART_COLORS
} from '@/components/dashboard/ChartKit';

// ── Local interfaces ──────────────────────────────────────────────────────────

interface ParentModuleProgress {
  module_id: string;
  module_name: string;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percentage: number;
}

interface FailedUnit {
  module_id: string;
  module_name: string;
  exam_title: string;
  obtained_marks: number;
  total_marks: number;
  passing_marks: number;
}

interface ParentChildProgress {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  grade_name: string;
  school_name: string;
  section_code?: string;
  section_name?: string;
  progress_percentage: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  modules: ParentModuleProgress[];
  failed_units: FailedUnit[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [children, setChildren]       = useState<ParentChildProgress[]>([]);
  const [analytics, setAnalytics]     = useState<ParentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [statusFilter, setStatusFilter]   = useState('All');
  const [currentUser, setCurrentUser]     = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    fetchData();
  }, []);

  // Fetch analytics whenever the selected child changes
  useEffect(() => {
    if (!expandedChild) return;
    const child = children.find(c => c.id === expandedChild);
    if (!child?.id) return;
    fetchAnalytics(child.id);
  }, [expandedChild]);

  useEffect(() => {
    const fetchFiltered = async () => {
      try {
        const res = await api.get(`/parent/dashboard?statusFilter=${statusFilter}`);
        setChildren(res.data.children || []);
      } catch (err) {
        console.error('Failed to fetch filtered parent dashboard data:', err);
      }
    };
    fetchFiltered();
  }, [statusFilter]);

  const fetchAnalytics = async (studentId: string) => {
    setAnalyticsLoading(true);
    try {
      const data = await analyticsService.getParent(studentId);
      setAnalytics(data);
    } catch (err) {
      console.error('Parent analytics fetch failed:', err);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get('/parent/dashboard');
      const kids = res.data.children || [];
      setChildren(kids);
      if (kids.length > 0) {
        setExpandedChild(kids[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch parent dashboard statistics:', err);
      toast.error('Failed to load performance statistics.');
    } finally {
      setLoading(false);
    }
  };

  // ── Skeleton ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPageShell>
        <div className="h-8 w-56 bg-slate-100 dark:bg-[#283548] rounded-full animate-pulse" />
        <StatGrid cols={4}>
          <SkeletonStatGrid count={4} />
        </StatGrid>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-64 bg-slate-100 dark:bg-[#283548] rounded-2xl animate-pulse" />
          <div className="lg:col-span-8 h-64 bg-slate-100 dark:bg-[#283548] rounded-2xl animate-pulse" />
        </div>
      </DashboardPageShell>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardPageShell>
        <WelcomeBanner
          badge="Secure Parent Area"
          badgeColor="indigo"
          title={`Welcome, ${currentUser?.first_name || 'Parent'}!`}
          subtitle="Track your children's learning, completed chapters, and school milestones in real time."
        />
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No Associated Students Found"
          description={`We couldn't find any students linked to your mobile number ${currentUser?.phone || ''}. Please ensure the school has registered your phone number correctly in the student profile.`}
        />
      </DashboardPageShell>
    );
  }

  const selectedChild = children.find(c => c.id === expandedChild) || children[0];

  const radius          = 24;
  const circumference   = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (selectedChild.progress_percentage / 100) * circumference;

  // ── Chart data mapping ──────────────────────────────────────────────────────

  const academicGrowth   = (analytics?.academic_growth    ?? []).map(d => ({ Month: d.month, Value: d.value }));
  const attendanceTrend  = (analytics?.attendance_trend   ?? []).map(d => ({ Month: d.month, Value: d.value }));
  const subjectPerf      = (analytics?.subject_performance ?? []).map(d => ({ Label: d.label, Value: d.value }));
  const examComparison   = (analytics?.exam_comparison    ?? []).map(d => ({ Month: d.month, Primary: d.primary, Secondary: d.secondary }));
  const passFail         = (analytics?.pass_fail_pie      ?? []).map(d => ({ Label: d.label, Value: d.value }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardPageShell>

      {/* Welcome Banner */}
      <WelcomeBanner
        badge="Secure Parent Area"
        badgeColor="indigo"
        title={`Welcome, ${currentUser?.first_name || 'Parent'}!`}
        subtitle="Track your children's learning, completed chapters, and school milestones in real time."
      />

      {/* Main Content: Children List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Children Selector Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <SectionHeader title="Your Children" className="mb-1" />
          <div className="space-y-3">
            {children.map((child) => {
              const isSelected = expandedChild === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setExpandedChild(child.id)}
                  className={`w-full text-left p-5 rounded-2xl transition-all flex flex-col gap-3.5 hover:shadow-md cursor-pointer border ${
                    isSelected
                      ? 'bg-white dark:bg-[#1e293b] border-primary ring-1 ring-primary shadow-md shadow-primary/5'
                      : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] hover:border-slate-300 dark:hover:border-[#475569]'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-[#283548] text-slate-500 dark:text-[#94a3b8]'
                      }`}>
                        {child.first_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm leading-tight text-slate-900 dark:text-white">{child.full_name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider pt-0.5 text-slate-400 dark:text-[#64748b]">{child.section_name ? (/^(section|division)/i.test(child.section_name) ? `${child.grade_name} - ${child.section_name}` : `${child.grade_name} - Division ${child.section_name}`) : (child.section_code ? `${child.grade_name} - Division ${child.section_code}` : child.grade_name)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-sm font-black text-primary">{child.progress_percentage}%</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748b]">Progress</span>
                    </div>
                  </div>
                  <div className="w-full pt-3 border-t border-slate-100 dark:border-[#283548] text-[10px] font-bold space-y-1.5 text-slate-500 dark:text-[#94a3b8]">
                    <div className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{child.school_name || 'NubeEra International School'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-[#283548] text-slate-500 dark:text-[#94a3b8]">
                        Student Performance Details
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider font-mono text-slate-400 dark:text-[#64748b]">
                        {child.section_name ? (/^(section|division)/i.test(child.section_name) ? `${child.grade_name} - ${child.section_name}` : `${child.grade_name} - Division ${child.section_name}`) : (child.section_code ? `${child.grade_name} - Division ${child.section_code}` : child.grade_name)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance Detail */}
        <div className="lg:col-span-8 space-y-5">

          {/* Detail Card Header */}
          <DashboardWidgetCard noPadding>
            <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-blue-50/80 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10 border-b border-indigo-100 dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden rounded-t-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />
              <div className="relative z-10 space-y-1.5">
                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/15 px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm animate-pulse">
                  Student Progress Details
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight pt-1">{selectedChild.full_name}</h2>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-[#cbd5e1] pt-1">
                  <div className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{selectedChild.school_name || 'NubeEra International School'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                    <span>{selectedChild.section_name ? (/^(section|division)/i.test(selectedChild.section_name) ? `${selectedChild.grade_name} - ${selectedChild.section_name}` : `${selectedChild.grade_name} - Division ${selectedChild.section_name}`) : (selectedChild.section_code ? `${selectedChild.grade_name} - Division ${selectedChild.section_code}` : selectedChild.grade_name)}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/parent/child-calendar/${selectedChild.student_id || selectedChild.id}`)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  View Academic Calendar
                </button>
              </div>

              {/* Radial Progress */}
              <div className="relative z-10 flex items-center gap-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-md px-5 py-3 rounded-[10px] border border-slate-200 dark:border-[#334155] shadow-sm self-start md:self-auto hover:bg-white/80 dark:hover:bg-[#1e293b]/80 transition-all">
                <div className="flex flex-col pr-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{selectedChild.progress_percentage}%</span>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest pt-2">Course Completion</span>
                </div>
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r={radius} className="text-slate-200 dark:text-[#334155]" strokeWidth="4.5" stroke="currentColor" fill="transparent" />
                    <circle cx="28" cy="28" r={radius} className="text-indigo-600 transition-all duration-1000 ease-out" strokeWidth="4.5"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                  </svg>
                  <span className="absolute text-[10px] font-black text-indigo-600">
                    {selectedChild.progress_percentage === 100 ? '🎉' : '✓'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mini Stats — analytics KPIs */}
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-[#283548]">
              <StatGrid cols={4}>
                <StatGridCards stats={[
                  { title: 'Attendance Rate', value: `${analytics?.attendance_rate ?? 0}%`, icon: <Activity className="w-5 h-5" />, color: 'teal', subtitle: 'Year to date' },
                  { title: 'Avg Exam Score',  value: `${analytics?.average_score ?? 0}%`,  icon: <TrendingUp className="w-5 h-5" />, color: 'indigo', subtitle: 'Overall average' },
                  { title: 'Exams Passed',    value: analytics?.exams_passed ?? 0,          icon: <CheckCircle className="w-5 h-5" />, color: 'emerald', subtitle: 'Exams cleared' },
                  { title: 'Exams Failed',    value: analytics?.exams_failed ?? 0,          icon: <Target className="w-5 h-5" />, color: 'rose', subtitle: 'Need a retake' },
                ]} />
              </StatGrid>
            </div>

            {/* Progress Bar */}
            <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#283548] border-b border-slate-100 dark:border-[#334155]">
              <div className="w-full bg-slate-200/70 dark:bg-[#334155]/70 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-primary h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${selectedChild.progress_percentage}%` }}
                />
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 bg-slate-50/60 dark:bg-[#283548]/60 border-b border-slate-100 dark:border-[#334155]">

              {/* Academic Growth */}
              <DashboardChartCard
                title="Learning Growth Trend"
                icon={<TrendingUp className="w-4 h-4 text-primary" />}
                badge="Monthly Score"
                badgeVariant="emerald"
              >
                <DashboardAreaChart
                  data={academicGrowth}
                  color={CHART_COLORS[1]}
                  height={180}
                  loading={analyticsLoading}
                  suffix="%"
                />
              </DashboardChartCard>

              {/* Attendance Trend */}
              <DashboardChartCard
                title="Attendance Monitoring"
                icon={<Activity className="w-4 h-4 text-teal-600" />}
                badge="Monthly"
                badgeVariant="teal"
              >
                <DashboardAreaChart
                  data={attendanceTrend}
                  color={CHART_COLORS[5]}
                  height={180}
                  loading={analyticsLoading}
                  suffix="%"
                />
              </DashboardChartCard>

              {/* Subject Performance */}
              <DashboardChartCard
                title="Progress by Subject"
                icon={<BarChart2 className="w-4 h-4 text-amber-600" />}
                badge="Avg Score"
                badgeVariant="amber"
              >
                <DashboardBarChart
                  data={subjectPerf}
                  color={CHART_COLORS[2]}
                  height={180}
                  loading={analyticsLoading}
                  suffix="%"
                  colorful
                />
              </DashboardChartCard>

              {/* Pass/Fail Pie */}
              <DashboardChartCard
                title="Exam Pass / Fail Rate"
                icon={<PieIcon className="w-4 h-4 text-primary" />}
                badge="All Exams"
                badgeVariant="primary"
              >
                <DashboardPieChart
                  data={passFail}
                  height={180}
                  loading={analyticsLoading}
                  colors={[CHART_COLORS[1], CHART_COLORS[8]]}
                />
              </DashboardChartCard>

            </div>

            {/* Exam Score vs Passing Marks dual trend */}
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-[#283548]">
              <DashboardChartCard
                title="Exam Score vs Passing Marks"
                icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
                badge="Trend"
                badgeVariant="primary"
              >
                <DashboardDualChart
                  data={examComparison}
                  primaryLabel="Score"
                  secondaryLabel="Passing Mark"
                  primaryColor={CHART_COLORS[0]}
                  secondaryColor={CHART_COLORS[8]}
                  height={200}
                  loading={analyticsLoading}
                />
              </DashboardChartCard>
            </div>

            {/* Failed / Weak Units */}
            {selectedChild.failed_units && selectedChild.failed_units.length > 0 && (
              <div className="mx-6 md:mx-8 mt-6 mb-2 p-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-400/20 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-300">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider">⚠️ Areas needing attention</h4>
                    <p className="text-[9px] text-rose-500 dark:text-rose-400/80 font-semibold uppercase tracking-wider">Please review these units with your child.</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-rose-200">
                  {selectedChild.failed_units.map((unit, idx) => (
                    <div key={idx} className="min-w-[280px] sm:min-w-[320px] snap-start bg-white dark:bg-[#1e293b] border border-rose-100 dark:border-rose-400/20 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-rose-500 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2 py-0.5 rounded uppercase tracking-wider">{unit.module_name}</span>
                        <h5 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] text-xs pt-1 line-clamp-1">{unit.exam_title}</h5>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-[#283548] mt-2 text-[11px]">
                        <span className="font-bold text-slate-400 dark:text-[#64748b]">Score: <strong className="text-rose-600 dark:text-rose-300 font-black">{unit.obtained_marks}</strong> / {unit.total_marks}</span>
                        <span className="text-[9px] bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 font-black px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-400/20 uppercase tracking-widest">Passing: {unit.passing_marks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chapter Breakdown */}
            <div className="p-6 md:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#283548] pb-3">
                <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">Lessons Breakdown</h3>
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-[#283548] text-slate-800 dark:text-[#e2e8f0] font-extrabold text-[10px] rounded px-2.5 py-1 border border-slate-200 dark:border-[#334155] cursor-pointer hover:bg-slate-200 dark:hover:bg-[#334155] outline-none transition-all"
                  >
                    <option value="All">All Units</option>
                    <option value="Completed">Completed Only</option>
                    <option value="Active">Active Only</option>
                  </select>
                </div>
              </div>

              {selectedChild.modules.length === 0 ? (
                <EmptyState title="No chapters configured for this grade level yet." />
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-200">
                  {selectedChild.modules.filter(module => {
                    if (statusFilter === 'Completed') return module.progress_percentage === 100;
                    if (statusFilter === 'Active') return module.progress_percentage < 100;
                    return true;
                  }).map((module) => {
                    const isDone = module.progress_percentage === 100;
                    return (
                      <div
                        key={module.module_id}
                        className="min-w-[260px] sm:min-w-[300px] snap-start p-5 bg-slate-50 dark:bg-[#283548] hover:bg-white dark:hover:bg-[#1e293b] border border-slate-100 dark:border-[#334155] hover:border-slate-300 dark:hover:border-[#475569] hover:shadow-md transition-all duration-300 rounded-[10px] flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-1 text-left">
                          <span className="font-black text-slate-800 dark:text-[#e2e8f0] text-sm block truncate">{module.module_name}</span>
                          <div className="text-[10px] text-slate-400 dark:text-[#64748b] font-extrabold uppercase tracking-wider">
                            {module.completed_lessons_count} / {module.total_lessons_count} Lessons Completed
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#334155] gap-2 mt-auto">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-[4px] shrink-0 ${isDone ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-[#283548] text-slate-600 dark:text-[#cbd5e1]'}`}>
                            {module.progress_percentage}% Done
                          </span>
                          <div className="w-20 bg-slate-200/70 dark:bg-[#334155]/70 h-2 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full transition-all duration-500 ${isDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-primary'}`}
                              style={{ width: `${module.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DashboardWidgetCard>

        </div>
      </div>

    </DashboardPageShell>
  );
};

export default ParentDashboard;
