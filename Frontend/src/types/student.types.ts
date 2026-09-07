/**
 * Student domain types.
 */

export interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username?: string;
  student_username?: string;
  parent_username?: string;
  student_id: string;
  roll_no?: string;
  grade_id: string;
  grade_name: string;
  school_id: string;
  school_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  admission_date?: string;
  parent_guardian_name?: string;
  parent_guardian_phone?: string;
  parent_guardian_email?: string;
  emergency_contact?: string;
  personal_note?: string;
  is_active: boolean;
}

export interface StudentCreatePayload {
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  student_username?: string;
  parent_username?: string;
  student_id: string;
  grade_id: string;
  school_id: string;
  roll_no?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  admission_date?: string;
  parent_guardian_name?: string;
  parent_guardian_phone?: string;
  parent_guardian_email?: string;
  emergency_contact?: string;
  password?: string;
}

export type StudentUpdatePayload = Partial<StudentCreatePayload>;

export interface StudentPromotePayload {
  school_id: string;
  new_academic_year: string;
}

export interface StudentRolloverPayload {
  school_id: string;
  new_academic_year: string;
}
