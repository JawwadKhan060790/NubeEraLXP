/**
 * Types barrel export.
 *
 * All shared types are now in domain-scoped files (auth.types.ts,
 * student.types.ts, etc.).  This file re-exports everything from those
 * modules so that existing imports (`from '../types/index'` or `from '@/types'`)
 * continue to resolve without changes across the codebase.
 *
 * If you need a new type, add it to the appropriate domain file, NOT here.
 */

export type { RoleValue, RoleKey } from '../constants/roles';
export * from './auth.types';
export * from './common.types';
export * from './school.types';
export * from './student.types';
export * from './teacher.types';
export * from './academic.types';

// Legacy aliases kept for backwards compatibility
/** @deprecated Use `RoleValue` from `@/constants/roles` instead. */
export type UserRole = 'admin' | 'principal' | 'teacher' | 'student' | 'staff' | 'superadmin' | 'parent';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  utype: UserRole;
  school_id?: string | null;
  phone?: string;
  is_active: boolean;
  profile_image_url?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

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

export interface School {
  id: string;
  school_code: string;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  student_id: string;
  grade_id: string;
  grade_name: string;
  school_id: string;
  school_name: string;
  personal_note?: string;
  is_active: boolean;
}

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  employee_id: string;
  school_id: string;
  school_name: string;
  specialization?: string;
  qualification?: string;
  is_active: boolean;
}

export interface Grade {
  id: string;
  school_id: string;
  school_name: string;
  grade_level: string;
  grade_name: string;
  capacity: number;
  class_teacher_id?: string;
  class_teacher_name?: string;
  class_room?: string;
  academic_year?: string;
  is_active: boolean;
  student_count: number;
}
