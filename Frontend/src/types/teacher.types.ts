/**
 * Teacher domain types.
 */

export interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  employee_id: string;
  school_id: string;
  school_name: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  salary?: number;
  joining_date?: string;
  is_active: boolean;
  is_pending?: boolean;
  /**
   * Requirement 2/3: full multi-school membership list (active + inactive,
   * non-deleted) — backs the Create/Edit screen's multi-select and the
   * read-only "Schools" column wherever Teachers are listed.
   */
  schools?: TeacherAvailableSchool[];
}

export interface TeacherCreatePayload {
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  school_id: string;
  /**
   * Requirement 2 (Multi-School Teacher Assignment): the full set of Schools
   * selected on the Create/Edit multi-select. `school_id` is always treated
   * as the primary/home school and is included automatically by the backend
   * if omitted from this list.
   */
  school_ids?: string[];
  phone?: string;
  specialization?: string;
  qualification?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  salary?: number;
  joining_date?: string;
  password?: string;
}

export type TeacherUpdatePayload = Partial<TeacherCreatePayload>;

// ── Multi-School Teacher Assignment (Requirement 2/3/7.2) ──────────────────

/**
 * One row per active School a Teacher belongs to — backs the post-login
 * school-switcher. Returned by GET /teacher-schools/my-schools (self) and
 * GET /teacher-schools/available-for-login/{teacherId} (admin preview).
 */
export interface TeacherAvailableSchool {
  school_id: string;
  school_name: string;
  is_primary: boolean;
  is_active: boolean;
}

/** Full Teacher-School membership row (active + inactive), with audit fields. */
export interface TeacherSchoolAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  school_id: string;
  school_name: string;
  is_active: boolean;
  is_primary: boolean;
  assigned_by: string;
  assigned_by_name?: string;
  assigned_date: string;
  notes?: string;
}

/** Full-set sync payload used by the Teacher Create/Edit multi-school selector. */
export interface TeacherSchoolAssignmentSetPayload {
  teacher_id: string;
  school_ids: string[];
  primary_school_id?: string | null;
  notes?: string;
}

/** Bulk-assign (or restore) a Teacher to one or more additional Schools. */
export interface AssignTeacherToSchoolsPayload {
  teacher_id: string;
  school_ids: string[];
  notes?: string;
}

export interface RemoveTeacherSchoolPayload {
  teacher_id: string;
  school_id: string;
  notes?: string;
}

export interface UpdateTeacherSchoolStatusPayload {
  is_active: boolean;
  notes?: string;
}

export interface SetPrimaryTeacherSchoolPayload {
  teacher_id: string;
  school_id: string;
}

export interface TeacherSchoolBulkError {
  id: string;
  reason: string;
}

export interface TeacherSchoolBulkResult {
  requested_count: number;
  succeeded_count: number;
  skipped_count: number;
  succeeded_ids: string[];
  errors: TeacherSchoolBulkError[];
}

export interface TeacherSchoolAuditLog {
  id: string;
  teacher_id: string;
  teacher_name: string;
  school_id: string;
  school_name: string;
  action_performed: string;
  performed_by: string;
  user_name: string;
  role: string;
  date_time: string;
  notes?: string;
}

// NOTE: these two query-param types are sent as URL query-string keys (GET
// requests bound by ASP.NET Core's [FromQuery] complex-object binder), which
// matches property names case-insensitively but does NOT understand snake_case
// — "page_size" will NOT bind to the C# "PageSize" property. Every other type
// in this file describes a JSON request/response BODY, which DOES go through
// the global snake_case naming policy — so only these two stay camelCase.
export interface TeacherSchoolQueryParams {
  teacherId?: string;
  schoolId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface TeacherSchoolAuditLogQueryParams {
  teacherId?: string;
  schoolId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}
