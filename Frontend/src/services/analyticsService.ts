/**
 * analyticsService.ts
 *
 * TypeScript interfaces mirror the backend AnalyticsDtos (snake_case — SnakeCaseLower policy).
 * One fetch function per role endpoint.
 */

import api from './api';

// ── Primitives ─────────────────────────────────────────────────────────────────

/** Bar/pie chart data point */
export interface ChartPoint {
  label: string;
  value: number;
}

/** Single-series time-series point */
export interface TrendPoint {
  month: string;
  value: number;
}

/** Two-series time-series point (e.g. this-year vs last-year) */
export interface DualTrendPoint {
  month: string;
  primary: number;
  secondary: number;
}

// ── SuperAdmin ────────────────────────────────────────────────────────────────

export interface SuperAdminAnalytics {
  total_schools:             number;
  total_students:            number;
  total_teachers:            number;
  total_parents:             number;
  total_staff:               number;
  active_users_today:        number;
  new_registrations_30d:     number;
  total_exams:               number;

  school_growth_trend:       TrendPoint[];
  student_growth_trend:      TrendPoint[];
  user_distribution:         ChartPoint[];
  top_schools_by_enrollment: ChartPoint[];
  platform_activity:         DualTrendPoint[];
  exam_performance_trend:    TrendPoint[];
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminAnalytics {
  total_students:              number;
  total_teachers:              number;
  total_grades:                number;
  total_schools:               number;
  total_exams:                 number;
  pending_students:            number;
  pending_teachers:            number;
  total_events:                number;

  student_admissions_trend:    TrendPoint[];
  teacher_recruitment_trend:   TrendPoint[];
  attendance_summary_by_school: ChartPoint[];
  academic_performance_dist:   ChartPoint[];
  event_participation_trend:   TrendPoint[];
  school_performance_comp:     ChartPoint[];
  exam_results_trend:          TrendPoint[];
  syllabus_completion_by_grade: ChartPoint[];
  subjectwise_performance:    ChartPoint[];
}

// ── Principal ─────────────────────────────────────────────────────────────────

export interface PrincipalAnalytics {
  total_students:         number;
  total_teachers:         number;
  total_grades:           number;
  total_exams:            number;
  total_modules:          number;
  avg_attendance_rate:    number;
  avg_exam_score:         number;
  total_events:           number;

  enrollment_trend:       TrendPoint[];
  class_attendance:       ChartPoint[];
  exam_results_trend:     TrendPoint[];
  subject_performance:    ChartPoint[];
  teacher_performance:    ChartPoint[];
  pass_fail_distribution: ChartPoint[];
  academic_growth:        DualTrendPoint[];
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export interface TeacherAnalytics {
  total_students:         number;
  total_modules:          number;
  total_lessons:          number;
  total_exams:            number;
  avg_attendance_rate:    number;
  avg_exam_score:         number;
  weak_students_count:    number;
  syllabus_completion:    number;

  attendance_trend:       TrendPoint[];
  performance_trend:      TrendPoint[];
  marks_distribution:     ChartPoint[];
  weak_students_analysis: ChartPoint[];
  assignment_status:      ChartPoint[];
  syllabus_progress:      ChartPoint[];
  exam_performance_trend: TrendPoint[];
}

// ── Student ───────────────────────────────────────────────────────────────────

export interface StudentAnalytics {
  total_modules:       number;
  completed_lessons:   number;
  total_exams:         number;
  average_score:       number;
  attendance_rate:     number;
  syllabus_completion: number;
  exams_passed:        number;
  exams_failed:        number;

  performance_trend:   TrendPoint[];
  subject_performance: ChartPoint[];
  attendance_trend:    TrendPoint[];
  learning_progress:   ChartPoint[];
  exam_result_trend:   TrendPoint[];
  pass_fail_pie:       ChartPoint[];
  achievement_growth:  TrendPoint[];
}

// ── Parent ────────────────────────────────────────────────────────────────────

export interface ParentAnalytics {
  child_name:          string;
  grade_name:          string;
  attendance_rate:     number;
  average_score:       number;
  syllabus_completion: number;
  exams_passed:        number;
  exams_failed:        number;
  total_exams:         number;

  academic_growth:     TrendPoint[];
  attendance_trend:    TrendPoint[];
  subject_performance: ChartPoint[];
  exam_comparison:     DualTrendPoint[];
  pass_fail_pie:       ChartPoint[];
  learning_progress:   ChartPoint[];
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export interface StaffAnalytics {
  total_students:          number;
  total_teachers:          number;
  total_open_tickets:      number;
  total_certificates:      number;
  total_report_cards:      number;
  total_events:            number;
  resolved_tickets:        number;
  new_students_this_month: number;

  ticket_trend:            TrendPoint[];
  admissions_trend:        TrendPoint[];
  certificates_trend:      TrendPoint[];
  report_cards_trend:      TrendPoint[];
  ticket_status_dist:      ChartPoint[];
  event_participation:     ChartPoint[];
  operations_summary:      DualTrendPoint[];
  syllabus_completion_by_grade: ChartPoint[];
  subjectwise_performance:    ChartPoint[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const analyticsService = {
  getSuperAdmin: () =>
    api.get<SuperAdminAnalytics>('/analytics/superadmin').then(r => r.data),

  getAdmin: () =>
    api.get<AdminAnalytics>('/analytics/admin').then(r => r.data),

  getPrincipal: () =>
    api.get<PrincipalAnalytics>('/analytics/principal').then(r => r.data),

  getTeacher: () =>
    api.get<TeacherAnalytics>('/analytics/teacher').then(r => r.data),

  getStudent: () =>
    api.get<StudentAnalytics>('/analytics/student').then(r => r.data),

  getParent: (studentId: string) =>
    api.get<ParentAnalytics>(`/analytics/parent/${studentId}`).then(r => r.data),

  getStaff: () =>
    api.get<StaffAnalytics>('/analytics/staff').then(r => r.data),
};

export default analyticsService;
