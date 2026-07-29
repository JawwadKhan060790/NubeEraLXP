/**
 * Academic domain types — Modules, Lessons, Exams, Questions, Results, Scheduler.
 */

// ── Module (Subject) ──────────────────────────────────────────────────────────

export interface Module {
  id: string;
  name: string;
  grade_id: string;
  grade_name: string;
  school_id: string;
  description?: string;
  thumbnail_url?: string;
  is_active: boolean;
  expected_periods?: number;
}

export interface ModuleCreatePayload {
  name: string;
  grade_id: string;
  description?: string;
}

export type ModuleUpdatePayload = Partial<ModuleCreatePayload>;

// ── Lesson (Topic) ────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  module_id: string;
  module_name: string;
  grade_id: string;
  grade_name: string;
  content?: string;
  video_url?: string;
  document_url?: string;
  order_number?: number;
  is_active: boolean;
  expected_periods?: number;
}

export interface LessonCreatePayload {
  title: string;
  module_id: string;
  content?: string;
  video_url?: string;
  order_number?: number;
  expected_periods?: number;
}

export type LessonUpdatePayload = Partial<LessonCreatePayload>;

// ── Exam ──────────────────────────────────────────────────────────────────────

export interface Exam {
  id: string;
  title: string;
  module_id: string;
  module_name: string;
  grade_id: string;
  grade_name: string;
  lesson_id?: string;
  date?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
  is_active: boolean;
}

export interface ExamCreatePayload {
  title?: string;
  module_id: string;
  grade_id: string;
  lesson_id?: string;
  date?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
}

export type ExamUpdatePayload = Partial<ExamCreatePayload>;

// ── Question (MCQ) ────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  exam_id: string;
  module_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  marks?: number;
}

export interface QuestionCreatePayload {
  exam_id: string;
  module_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  marks?: number;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export interface SchedulerEntry {
  id: string;
  school_id: string;
  grade_id: string;
  grade_name: string;
  module_id: string;
  module_name: string;
  teacher_id?: string;
  teacher_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  total_schools: number;
  total_grades: number;
  total_principals: number;
  total_principals_pending: number;
  total_teachers: number;
  total_teachers_pending: number;
  total_students: number;
  total_students_pending: number;
  total_modules: number;
  total_lessons: number;
  total_exams: number;
  total_results: number;
  student_progress: { name: string; progress: number }[];
}
