/**
 * Authentication domain types.
 */

import type { RoleValue } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  /** Original role string from backend (e.g. "SuperAdmin"). */
  role: string;
  /** Frontend utype mapped from backend role (e.g. "admin"). */
  utype: RoleValue;
  school_id?: string | null;
  school_name?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
  grade_id?: string | null;
  phone?: string;
  is_active: boolean;
  profile_image_url?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
