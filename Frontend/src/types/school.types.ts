/**
 * School and Grade domain types.
 */

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
  from_grade?: number;
  to_grade?: number;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at?: string;
}

export interface SchoolCreatePayload {
  name: string;
  school_code: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  from_grade?: number;
  to_grade?: number;
  latitude?: number;
  longitude?: number;
}

export type SchoolUpdatePayload = Partial<SchoolCreatePayload>;

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

export interface GradeCreatePayload {
  school_id: string;
  grade_level: string;
  grade_name: string;
  capacity: number;
  class_teacher_id?: string;
  class_room?: string;
  academic_year?: string;
}

export type GradeUpdatePayload = Partial<GradeCreatePayload>;
