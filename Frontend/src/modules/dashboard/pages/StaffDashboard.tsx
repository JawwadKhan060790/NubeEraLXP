import StatGridCards from '@/components/StatGrid';
import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardDualChart, DashboardPieChart
} from '@/components/dashboard/ChartKit';
import {
  DashboardChartCard,
  DashboardPageShell,
  DashboardWidgetCard, SectionHeader,
  StatGrid,
  WelcomeBanner,
} from '@/components/dashboard/DashboardKit';
import analyticsService, { type StaffAnalytics } from '@/services/analyticsService';
import api from '@/services/api';
import {
  Award, BarChart3, BookOpen, BookText, Calendar, Check, FileText,
  GraduationCap, HelpCircle, LayoutDashboard, School,
  Search, Ticket, TrendingUp, Users, X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const StaffDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Analytics fetch (independent — doesn't block the page)
    try {
      const data = await analyticsService.getStaff();
      setAnalytics(data);
    } catch {
      /* show zeros gracefully */
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <DashboardPageShell>
      {/* ── Header ──────────────────────────────────────────── */}
      <WelcomeBanner
        badge="Staff Portal"
        badgeColor="teal"
        title="Staff Dashboard"
        subtitle="Real-time operations: tickets, admissions, certificates, events and teacher attendance."
      />

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <StatGrid cols={4}>
        <StatGridCards loading={analyticsLoading} stats={[
          { title: 'Students',     value: analytics?.total_students          ?? 0, icon: <Users         className="w-5 h-5" />, color: 'indigo' , subtitle: 'All enrolled learners' },
          { title: 'Teachers',     value: analytics?.total_teachers          ?? 0, icon: <GraduationCap className="w-5 h-5" />, color: 'violet' , subtitle: 'All registered faculty' },
          { title: 'Open Tickets', value: analytics?.total_open_tickets      ?? 0, icon: <Ticket        className="w-5 h-5" />, color: 'rose'   , subtitle: 'Awaiting resolution' },
          { title: 'Certificates', value: analytics?.total_certificates      ?? 0, icon: <Award         className="w-5 h-5" />, color: 'amber'  , subtitle: 'Issued to date' },
          { title: 'Report Cards', value: analytics?.total_report_cards      ?? 0, icon: <FileText      className="w-5 h-5" />, color: 'sky'    , subtitle: 'Generated to date' },
          { title: 'Events',       value: analytics?.total_events            ?? 0, icon: <Calendar      className="w-5 h-5" />, color: 'teal'   , subtitle: 'Scheduled or held' },
          { title: 'Resolved',     value: analytics?.resolved_tickets        ?? 0, icon: <Check         className="w-5 h-5" />, color: 'emerald', subtitle: 'Tickets closed' },
          { title: 'New Students', value: analytics?.new_students_this_month ?? 0, icon: <TrendingUp    className="w-5 h-5" />, color: 'purple' , subtitle: 'last 30 days' },
        ]} />
      </StatGrid>

      {/* ── Syllabus and Subject Charts (Requested) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <DashboardChartCard
          className="lg:col-span-6"
          title="Syllabus Completion by Grade"
          icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-500" />}
          badge="Coverage"
          badgeVariant="primary"
        >
          <div className="min-h-[260px]">
            <DashboardBarChart
              data={(analytics?.syllabus_completion_by_grade || (analytics as any)?.syllabusCompletionByGrade || []).map(d => ({
                Label: d.label || d.Label || '',
                Value: d.value ?? d.Value ?? 0,
              }))}
              color="#6366f1"
              height={260}
              loading={analyticsLoading}
              suffix="%"
            />
          </div>
        </DashboardChartCard>

        <DashboardChartCard
          className="lg:col-span-6"
          title="Subjectwise Academic Performance"
          icon={<BarChart3 className="w-4.5 h-4.5 text-teal-600" />}
          badge="Average Score"
          badgeVariant="teal"
        >
          <div className="min-h-[260px]">
            <DashboardBarChart
              data={(analytics?.subjectwise_performance || (analytics as any)?.subjectwisePerformance || []).map(d => ({
                Label: d.label || d.Label || '',
                Value: d.value ?? d.Value ?? 0,
              }))}
              color="#14b8a6"
              height={260}
              loading={analyticsLoading}
              suffix="%"
              colorful
            />
          </div>
        </DashboardChartCard>
      </div>

      {/* ── Row 1: Ticket + Admissions dual trend | Ticket Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DashboardChartCard
          className="lg:col-span-7"
          title="Ticket & Admissions Trend"
          icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-500" />}
          badge="6 months"
          badgeVariant="primary"
        >
          <DashboardDualChart
            data={(analytics?.operations_summary ?? []).map(d => ({
              Month: d.month, Primary: d.primary, Secondary: d.secondary,
            }))}
            primaryLabel="Tickets"
            secondaryLabel="Certificates"
            primaryColor="#6366f1"
            secondaryColor="#10b981"
            loading={analyticsLoading}
          />
        </DashboardChartCard>

        <DashboardChartCard
          className="lg:col-span-5"
          title="Ticket Status Distribution"
          icon={<Ticket className="w-4.5 h-4.5 text-rose-500" />}
          badge="Live"
          badgeVariant="emerald"
        >
          <DashboardPieChart
            data={(analytics?.ticket_status_dist ?? []).map(d => ({
              Label: d.label, Value: d.value,
            }))}
            loading={analyticsLoading}
          />
        </DashboardChartCard>
      </div>

      {/* ── Row 2: Admissions trend | Event Participation ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DashboardChartCard
          className="lg:col-span-6"
          title="Student Admissions (6 months)"
          icon={<Users className="w-4.5 h-4.5 text-violet-500" />}
          badge="Admissions"
          badgeVariant="primary"
        >
          <DashboardAreaChart
            data={(analytics?.admissions_trend ?? []).map(d => ({ Month: d.month, Value: d.value }))}
            color="#8b5cf6"
            loading={analyticsLoading}
          />
        </DashboardChartCard>

        <DashboardChartCard
          className="lg:col-span-6"
          title="Top Events by Registrations"
          icon={<Calendar className="w-4.5 h-4.5 text-teal-500" />}
          badge="Events"
          badgeVariant="emerald"
        >
          <DashboardBarChart
            data={(analytics?.event_participation ?? []).map(d => ({ Label: d.label, Value: d.value }))}
            color="#14b8a6"
            layout="horizontal"
            loading={analyticsLoading}
          />
        </DashboardChartCard>
      </div>



      {/* ── System Management ─────────────────────────────── */}
      <DashboardWidgetCard noPadding>
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">System Management</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Quick access to essential management tools</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-white text-slate-800 font-bold text-[10px] rounded-lg border border-slate-200 px-2.5 py-1.5 cursor-pointer outline-none"
            >
              <option value="All">All Operations</option>
              <option value="Academic">Academic Focus</option>
              <option value="Institution">Institutional Focus</option>
            </select>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full tracking-wider">Management</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Add Grade',     href: '/staff/grades/create/',         icon: GraduationCap, color: 'from-violet-500 to-violet-600', ring: 'hover:ring-violet-200', type: 'Academic',     description: 'Create a new academic grade' },
              { label: 'Add Unit',      href: '/staff/modules/create/',        icon: BookOpen,      color: 'from-blue-500 to-blue-600',     ring: 'hover:ring-blue-200',   type: 'Academic',     description: 'Add a new academic unit' },
              { label: 'Add Topic',     href: '/staff/lessons/create/',        icon: BookText,      color: 'from-emerald-500 to-emerald-600',ring: 'hover:ring-emerald-200',type: 'Academic',     description: 'Create lesson topics' },
              { label: 'Add MCQ',       href: '/staff/exam/create/',           icon: HelpCircle,    color: 'from-amber-500 to-amber-600',   ring: 'hover:ring-amber-200',  type: 'Academic',     description: 'Set up an MCQ exam' },
              { label: 'Add Questions', href: '/staff/modulequestion/create/', icon: HelpCircle,    color: 'from-rose-500 to-rose-600',     ring: 'hover:ring-rose-200',   type: 'Academic',     description: 'Add exam questions' },
              { label: 'Add School',    href: '/staff/schools/create/',        icon: School,        color: 'from-teal-500 to-teal-600',     ring: 'hover:ring-teal-200',   type: 'Institution',  description: 'Register a new campus' },
            ].filter(a => actionFilter === 'All' || a.type === actionFilter)
             .map((action, i) => {
               const Icon = action.icon;
               return (
                 <a key={i} href={action.href}
                   className={`group relative flex flex-col items-center gap-3.5 p-5 rounded-2xl border border-slate-200 bg-white hover:border-transparent ring-2 ring-transparent ${action.ring} hover:shadow-lg transition-all duration-200`}>
                   <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                     <Icon className="w-5 h-5" />
                   </div>
                   <div className="text-center space-y-0.5">
                     <span className="text-[12px] font-bold text-slate-800 block leading-tight">{action.label}</span>
                     <span className="text-[10px] text-slate-400 font-medium block">{action.description}</span>
                   </div>
                   <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.color} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                 </a>
               );
             })}
          </div>
        </div>
      </DashboardWidgetCard>
    </DashboardPageShell>
  );
};

export default StaffDashboard;
