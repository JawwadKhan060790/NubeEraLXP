import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import ReportPage from '@/components/reports/ReportPage';
import type { ReportFilterFieldOption } from '@/components/reports/ReportFilter';

/**
 * ReportView — the route-level wrapper that turns a URL like `/reports/student-attendance`
 * into a fully working report screen. The provider key IS the route param: every one of
 * the 18 categories' reports renders through this exact same component + `<ReportPage>`,
 * which is the point of the generic engine — adding report #19 means registering a new
 * provider on the backend, never touching routing or screens.
 *
 * Per-report sort/status choices are declared here (they vary by dataset) while
 * everything else — fetching, filtering, KPIs, charts, grid, export, RBAC — stays
 * inside the shared `ReportPage`/`useReport`/`reportService` stack.
 */

const STATUS_OPTIONS: ReportFilterFieldOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS_BY_KEY: Record<string, ReportFilterFieldOption[]> = {
  'student-enrollment': [{ value: 'name', label: 'Name' }, { value: 'enrollment_date', label: 'Enrollment Date' }, { value: 'grade', label: 'Grade' }],
  'student-attendance': [{ value: 'name', label: 'Name' }, { value: 'attendance_rate', label: 'Attendance Rate' }, { value: 'date', label: 'Date' }],
  'student-performance': [{ value: 'name', label: 'Name' }, { value: 'average_score', label: 'Average Score' }, { value: 'grade', label: 'Grade' }],
  'parent-child-progress': [{ value: 'parent_name', label: 'Parent Name' }, { value: 'child_name', label: 'Child Name' }, { value: 'progress', label: 'Progress' }],
  'teacher-workload': [{ value: 'name', label: 'Name' }, { value: 'classes', label: 'Classes' }, { value: 'hours', label: 'Hours' }],
  'staff-directory': [{ value: 'name', label: 'Name' }, { value: 'role', label: 'Role' }, { value: 'department', label: 'Department' }],
  'principal-school-overview': [{ value: 'school_name', label: 'School Name' }, { value: 'enrollment', label: 'Enrollment' }],
  'attendance-daily-summary': [{ value: 'date', label: 'Date' }, { value: 'present_rate', label: 'Present Rate' }],
  'enrollment-trend': [{ value: 'period', label: 'Period' }, { value: 'total', label: 'Total' }],
  'course-catalog': [{ value: 'name', label: 'Course Name' }, { value: 'subject', label: 'Subject' }, { value: 'enrolled', label: 'Enrolled' }],
  'assessment-results': [{ value: 'student_name', label: 'Student Name' }, { value: 'score', label: 'Score' }, { value: 'date', label: 'Date' }],
  'examination-schedule': [{ value: 'exam_name', label: 'Exam Name' }, { value: 'date', label: 'Date' }, { value: 'subject', label: 'Subject' }],
  'certificate-eligibility': [{ value: 'student_name', label: 'Student Name' }, { value: 'eligible_since', label: 'Eligible Since' }],
  'event-participation': [{ value: 'event_name', label: 'Event Name' }, { value: 'date', label: 'Date' }, { value: 'participants', label: 'Participants' }],
  'learning-progress': [{ value: 'student_name', label: 'Student Name' }, { value: 'completion', label: 'Completion %' }],
  'performance-leaderboard': [{ value: 'rank', label: 'Rank' }, { value: 'name', label: 'Name' }, { value: 'score', label: 'Score' }],
  'financial-orders': [{ value: 'order_date', label: 'Order Date' }, { value: 'amount', label: 'Amount' }, { value: 'status', label: 'Status' }],
  'audit-activity-log': [{ value: 'timestamp', label: 'Timestamp' }, { value: 'actor', label: 'Actor' }, { value: 'action', label: 'Action' }],
  'user-activity': [{ value: 'timestamp', label: 'Timestamp' }, { value: 'user', label: 'User' }, { value: 'activity', label: 'Activity' }],
  'custom-student-directory': [{ value: 'name', label: 'Name' }, { value: 'school', label: 'School' }, { value: 'grade', label: 'Grade' }],
};

const NO_DATE_RANGE = new Set(['staff-directory', 'course-catalog', 'certificate-eligibility', 'custom-student-directory', 'principal-school-overview']);
const NO_STATUS = new Set(['enrollment-trend', 'attendance-daily-summary', 'performance-leaderboard', 'learning-progress']);

const ReportView: React.FC = () => {
  const { key } = useParams<{ key: string }>();

  if (!key) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-10 text-center">
        <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600 dark:text-[#cbd5e1]">No report selected.</p>
        <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mt-3 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Reporting Center
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/reports" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All Reports
      </Link>
      <ReportPage
        reportKey={key}
        sortOptions={SORT_OPTIONS_BY_KEY[key]}
        statusOptions={NO_STATUS.has(key) ? undefined : STATUS_OPTIONS}
        showDateRange={!NO_DATE_RANGE.has(key)}
      />
    </div>
  );
};

export default ReportView;
