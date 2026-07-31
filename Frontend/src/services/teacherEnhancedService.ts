/**
 * Teacher Enhanced Module Service
 *
 * API calls for: Teacher Learning Path, Schedule Periods,
 * Grade-wise Student List, and Student Weakness Analysis.
 */

import { get, post, put } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopicProgress {
  lesson_id: string;
  sub_topic: string;
  serial_number: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  started_at?: string;
  completed_at?: string;
  remarks?: string;
  is_activity: boolean;
  expected_periods: number;
  executed_periods: number;
  executed_hours: number;
}

export interface ModuleProgress {
  module_id: string;
  module_name: string;
  total_lessons: number;
  completed_lessons: number;
  completion_percentage: number;
  expected_periods: number;
  executed_periods: number;
  executed_hours: number;
  topics: TopicProgress[];
}

export interface TeacherLearningPath {
  grade_id: string;
  grade_name: string;
  section_id?: string;
  section_name?: string;
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  pending_topics: number;
  completion_percentage: number;
  estimated_remaining_topics: number;
  modules: ModuleProgress[];
}

export interface GradeSyllabus {
  grade_id: string;
  grade_name: string;
  section_id?: string;
  total_topics: number;
  completed_topics: number;
  completion_percentage: number;
}

export interface SubjectSyllabus {
  module_id: string;
  module_name: string;
  grade_name: string;
  total_topics: number;
  completed_topics: number;
  completion_percentage: number;
}

export interface MonthlySyllabus {
  month: number;
  year: number;
  month_name: string;
  completed_topics: number;
  completion_percentage: number;
}

export interface SyllabusCompletion {
  overall_completion_percentage: number;
  grade_breakdown: GradeSyllabus[];
  subject_breakdown: SubjectSyllabus[];
  monthly_breakdown: MonthlySyllabus[];
  completed_topics: number;
  remaining_topics: number;
  delayed_topics: number;
  overdue_topics: number;
}

export interface TeacherStudentRow {
  student_id: string;
  student_name: string;
  roll_no?: string;
  grade_name: string;
  section_name?: string;
  attendance_percent: number;
  course_completion_percent: number;
  weak_topics_count: number;
  last_activity_date?: string;
  current_module_name?: string;
  current_topic_name?: string;
  learning_velocity: 'Fast' | 'Average' | 'NeedsAttention';
}

export interface GradeStudentList {
  grade_id: string;
  grade_name: string;
  grade_completion_percent: number;
  average_attendance_percent: number;
  total_periods_planned: number;
  total_periods_conducted: number;
  periods_completion_percent: number;
  completed_students: number;
  in_progress_students: number;
  behind_schedule_students: number;
  students: TeacherStudentRow[];
}

export interface SchedulePeriod {
  id: string;
  scheduler_id: string;
  grade_id: string;
  grade_name: string;
  section_id?: string;
  section_name?: string;
  module_id?: string;
  module_name?: string;
  lesson_id?: string;
  lesson_name?: string;
  period_date: string;
  start_time: string;
  end_time: string;
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'Missed';
  actual_start_time?: string;
  actual_end_time?: string;
  remarks?: string;
}

export interface DailySchedule {
  date: string;
  day_name: string;
  total: number;
  completed: number;
  pending: number;
  missed: number;
  periods: SchedulePeriod[];
}

export interface WeeklySchedule {
  week_start: string;
  week_end: string;
  days: DailySchedule[];
}

export interface CalendarEvent {
  period_id: string;
  scheduler_id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  color: string;
  grade_name?: string;
  module_name?: string;
  lesson_name?: string;
  section_id?: string;
  section_name?: string;
}

export interface StudentWeakTopic {
  id: string;
  student_id: string;
  student_name: string;
  grade_id: string;
  grade_name: string;
  module_id: string;
  module_name: string;
  lesson_id: string;
  lesson_name: string;
  weakness_level: 'Low' | 'Medium' | 'High';
  source: string;
  score: number;
  max_score: number;
  score_percent: number;
  attempts: number;
  last_assessment_date: string;
  recommended_revision?: string;
  is_resolved: boolean;
  resolved_at?: string;
}

export interface StudentWeaknessAnalysis {
  student_id: string;
  student_name: string;
  grade_name: string;
  total_weak_topics: number;
  high_weakness: number;
  medium_weakness: number;
  low_weakness: number;
  resolved_count: number;
  weak_topics: StudentWeakTopic[];
}

export interface GradeWeaknessAnalysis {
  grade_id: string;
  grade_name: string;
  total_weak_instances: number;
  top_weak_topics: {
    lesson_id: string;
    topic_name: string;
    module_name: string;
    affected_students: number;
    average_score: number;
  }[];
  students: StudentWeaknessAnalysis[];
}

export interface TeacherPeriodSummary {
  schedule_period_id: string;
  scheduler_id: string;
  grade_id: string;
  grade_name: string;
  module_name?: string;
  lesson_name?: string;
  period_date: string;
  start_time: string;
  end_time: string;
  status: string;
  remarks?: string;
}

export interface TeacherEnhancedDashboard {
  today_total_periods: number;
  today_completed_periods: number;
  today_pending_periods: number;
  today_missed_periods: number;
  total_students_assigned: number;
  weak_students_count: number;
  overall_syllabus_completion: number;
  weak_topics_count: number;
  attendance_summary_percent: number;
  grade_progress_list: {
    grade_id: string;
    grade_name: string;
    total_students: number;
    syllabus_completion_percentage: number;
  }[];
  today_schedule: TeacherPeriodSummary[];
  upcoming_periods: TeacherPeriodSummary[];
}

// ── Learning Path ─────────────────────────────────────────────────────────────

export const getLearningPaths = (): Promise<TeacherLearningPath[]> =>
  get<TeacherLearningPath[]>(API_ENDPOINTS.TEACHER_LEARNING_PATH.BASE);

export const getLearningPathByGrade = (gradeId: string, sectionId?: string): Promise<TeacherLearningPath> =>
  get<TeacherLearningPath>(API_ENDPOINTS.TEACHER_LEARNING_PATH.BY_GRADE(gradeId, sectionId));

export const updateTopicStatus = (payload: {
  lesson_id: string;
  grade_id: string;
  module_id: string;
  section_id?: string;
  status: string;
  remarks?: string;
}): Promise<void> =>
  put<void>(API_ENDPOINTS.TEACHER_LEARNING_PATH.UPDATE_STATUS, payload);

export const getSyllabusCompletion = (): Promise<SyllabusCompletion> =>
  get<SyllabusCompletion>(API_ENDPOINTS.TEACHER_LEARNING_PATH.SYLLABUS);

export const getGradeStudentList = (gradeId: string, sectionId?: string): Promise<GradeStudentList> =>
  get<GradeStudentList>(API_ENDPOINTS.TEACHER_LEARNING_PATH.GRADE_STUDENTS(gradeId, sectionId));

export const getEnhancedDashboard = (): Promise<TeacherEnhancedDashboard> =>
  get<TeacherEnhancedDashboard>(API_ENDPOINTS.TEACHER_LEARNING_PATH.ENHANCED_DASHBOARD);

// ── Schedule Periods ──────────────────────────────────────────────────────────

export const getDailySchedule = (date?: string): Promise<DailySchedule> =>
  get<DailySchedule>(API_ENDPOINTS.TEACHER_SCHEDULE_PERIODS.DAILY + (date ? `?date=${date}` : ''));

export const getWeeklySchedule = (weekStart?: string): Promise<WeeklySchedule> =>
  get<WeeklySchedule>(API_ENDPOINTS.TEACHER_SCHEDULE_PERIODS.WEEKLY + (weekStart ? `?weekStart=${weekStart}` : ''));

export const getMonthlyCalendar = (year: number, month: number): Promise<CalendarEvent[]> =>
  get<CalendarEvent[]>(`${API_ENDPOINTS.TEACHER_SCHEDULE_PERIODS.MONTHLY}?year=${year}&month=${month}`);

export const updatePeriodStatus = (
  schedulerId: string,
  periodDate: string,
  payload: { status: string; remarks?: string; actual_start_time?: string; actual_end_time?: string },
): Promise<SchedulePeriod> =>
  put<SchedulePeriod>(
    `${API_ENDPOINTS.TEACHER_SCHEDULE_PERIODS.UPDATE(schedulerId)}?periodDate=${periodDate}`,
    payload,
  );

export const seedTodayPeriods = (): Promise<{ message: string }> =>
  post<{ message: string }>(API_ENDPOINTS.TEACHER_SCHEDULE_PERIODS.SEED_TODAY);

// ── Student Weakness ──────────────────────────────────────────────────────────

export const getStudentWeakness = (studentId: string): Promise<StudentWeaknessAnalysis> =>
  get<StudentWeaknessAnalysis>(API_ENDPOINTS.STUDENT_WEAKNESS.BY_STUDENT(studentId));

export const getGradeWeakness = (gradeId: string, sectionId?: string): Promise<GradeWeaknessAnalysis> =>
  get<GradeWeaknessAnalysis>(API_ENDPOINTS.STUDENT_WEAKNESS.BY_GRADE(gradeId, sectionId));

export const createWeakTopic = (payload: {
  student_id: string;
  grade_id: string;
  module_id: string;
  lesson_id: string;
  weakness_level?: string;
  source?: string;
  score: number;
  max_score: number;
  recommended_revision?: string;
}): Promise<{ id: string }> =>
  post<{ id: string }>(API_ENDPOINTS.STUDENT_WEAKNESS.CREATE, payload);

export const resolveWeakTopic = (id: string): Promise<void> =>
  put<void>(API_ENDPOINTS.STUDENT_WEAKNESS.RESOLVE(id));

export const syncWeaknessFromResults = (gradeId: string): Promise<{ message: string }> =>
  post<{ message: string }>(API_ENDPOINTS.STUDENT_WEAKNESS.SYNC_FROM_RESULTS(gradeId));

// ── Named export object ───────────────────────────────────────────────────────

export const teacherEnhancedService = {
  getLearningPaths,
  getLearningPathByGrade,
  updateTopicStatus,
  getSyllabusCompletion,
  getGradeStudentList,
  getEnhancedDashboard,
  getDailySchedule,
  getWeeklySchedule,
  getMonthlyCalendar,
  updatePeriodStatus,
  seedTodayPeriods,
  getStudentWeakness,
  getGradeWeakness,
  createWeakTopic,
  resolveWeakTopic,
  syncWeaknessFromResults,
};
