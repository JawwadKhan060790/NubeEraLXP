/**
 * Curriculum domain types — School-Based Curriculum Assignment
 * (Requirement 1/4/5/6/7.1/7.3).
 *
 * Units and Topics are global master records owned centrally by Admin/Staff.
 * A School only gains visibility into one once Admin explicitly assigns it
 * via SchoolUnitAssignment / SchoolTopicAssignment — these are the join
 * tables (and their DTOs) backing that assignment.
 *
 * NOTE on casing: JSON request/response BODIES use the backend's global
 * snake_case naming policy (see TeacherSchoolQueryParams note in
 * teacher.types.ts for the one exception — GET query-string param types,
 * which must stay camelCase because [FromQuery] binding is case-insensitive
 * but does not strip underscores).
 */

// ── Units ────────────────────────────────────────────────────────────────

export interface Unit {
  id: string;
  name: string;
  code?: string;
  description?: string;
  grade_level_id?: string;
  grade_level_name?: string;
  display_order: number;
  is_active: boolean;
  topic_count: number;
  assigned_school_count: number;
  created_at: string;
}

export interface UnitCreatePayload {
  name: string;
  code?: string;
  description?: string;
  grade_level_id?: string;
  display_order: number;
}

export interface UnitUpdatePayload extends UnitCreatePayload {
  is_active: boolean;
}

export interface UnitSummary {
  id: string;
  name: string;
  code?: string;
}

export interface UnitQueryParams {
  gradeLevelId?: string;
  isActive?: boolean;
}

// ── Topics ───────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  unit_id: string;
  unit_name: string;
  name: string;
  code?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  assigned_school_count: number;
  created_at: string;
}

export interface TopicCreatePayload {
  unit_id: string;
  name: string;
  code?: string;
  description?: string;
  display_order: number;
}

export interface TopicUpdatePayload {
  name: string;
  code?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface TopicSummary {
  id: string;
  unit_id: string;
  name: string;
  code?: string;
}

export interface TopicQueryParams {
  unitId?: string;
  isActive?: boolean;
}

// ── School Curriculum Assignment ────────────────────────────────────────

export interface AssignUnitsToSchoolPayload {
  school_id: string;
  unit_ids: string[];
  notes?: string;
}

export interface AssignTopicsToSchoolPayload {
  school_id: string;
  topic_ids: string[];
  notes?: string;
}

export interface UnassignUnitsFromSchoolPayload {
  school_id: string;
  unit_ids: string[];
  notes?: string;
}

export interface UnassignTopicsFromSchoolPayload {
  school_id: string;
  topic_ids: string[];
  notes?: string;
}

export interface BulkCurriculumAssignmentError {
  id: string;
  reason: string;
}

export interface BulkCurriculumAssignmentResult {
  requested_count: number;
  succeeded_count: number;
  skipped_count: number;
  succeeded_ids: string[];
  errors: BulkCurriculumAssignmentError[];
}

export interface SchoolUnitAssignment {
  id: string;
  school_id: string;
  school_name: string;
  unit_id: string;
  unit_name: string;
  unit_code?: string;
  assigned_by: string;
  assigned_by_name?: string;
  assigned_date: string;
  notes?: string;
}

export interface SchoolTopicAssignment {
  id: string;
  school_id: string;
  school_name: string;
  topic_id: string;
  topic_name: string;
  topic_code?: string;
  unit_id: string;
  unit_name: string;
  assigned_by: string;
  assigned_by_name?: string;
  assigned_date: string;
  notes?: string;
}

/** Combined Unit+Topic catalog row with assigned/unassigned flag for one School in context. */
export interface SchoolCurriculumCatalogItem {
  id: string;
  /** "Unit" or "Topic". */
  entity_type: 'Unit' | 'Topic';
  name: string;
  code?: string;
  parent_unit_id?: string;
  parent_unit_name?: string;
  /** School-agnostic master grade level (1st..10th Grade) this Unit/Topic belongs to. */
  grade_level_id?: string;
  grade_level_name?: string;
  subject_id?: string;
  subject_name?: string;
  is_active: boolean;
  is_assigned_to_school: boolean;
  assigned_date?: string;
}

export interface SchoolCurriculumCatalogQueryParams {
  schoolId: string;
  /** "Unit", "Topic", or omit for both. */
  entityType?: 'Unit' | 'Topic';
  unitId?: string;
  /** true = only assigned, false = only unassigned, omit = all. */
  assignedOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CurriculumAssignmentAuditLog {
  id: string;
  school_id: string;
  school_name: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action_performed: string;
  performed_by: string;
  user_name: string;
  role: string;
  date_time: string;
  notes?: string;
}

export interface CurriculumAssignmentAuditLogQueryParams {
  schoolId?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/** Per-School curriculum dashboard summary (Requirement 7.3). */
export interface SchoolCurriculumDashboard {
  school_id: string;
  school_name: string;
  assigned_unit_count: number;
  assigned_topic_count: number;
  teacher_count: number;
  student_count: number;
  last_assignment_date?: string;
}
