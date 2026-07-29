/**
 * Teacher-School Assignment Service
 *
 * Multi-School Teacher Assignment (Requirement 2), the post-login
 * school-switcher data source (Requirement 3), and the Admin Teacher-School
 * Assignment screen (Requirement 7.2).
 */

import { get, post, put } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  TeacherAvailableSchool,
  TeacherSchoolAssignment,
  TeacherSchoolAssignmentSetPayload,
  AssignTeacherToSchoolsPayload,
  RemoveTeacherSchoolPayload,
  UpdateTeacherSchoolStatusPayload,
  SetPrimaryTeacherSchoolPayload,
  TeacherSchoolBulkResult,
  TeacherSchoolAuditLog,
  TeacherSchoolQueryParams,
  TeacherSchoolAuditLogQueryParams,
} from '../types/teacher.types';
import type { PaginatedResponse } from '../types/common.types';

/** Self-service: active School memberships for the logged-in Teacher (school-switcher). */
const getMySchools = (): Promise<TeacherAvailableSchool[]> =>
  get<TeacherAvailableSchool[]>(API_ENDPOINTS.TEACHER_SCHOOLS.MY_SCHOOLS);

/** Admin: full (active + inactive) membership list for a Teacher — backs the Edit screen's multi-select. */
const getByTeacher = (teacherId: string): Promise<TeacherSchoolAssignment[]> =>
  get<TeacherSchoolAssignment[]>(API_ENDPOINTS.TEACHER_SCHOOLS.BY_TEACHER(teacherId));

/** Admin preview of a Teacher's active School memberships. */
const getAvailableSchoolsForLogin = (teacherId: string): Promise<TeacherAvailableSchool[]> =>
  get<TeacherAvailableSchool[]>(API_ENDPOINTS.TEACHER_SCHOOLS.AVAILABLE_FOR_LOGIN(teacherId));

/** Paged grid for the Admin Teacher-School Assignment screen. */
const getPaged = (params: TeacherSchoolQueryParams): Promise<PaginatedResponse<TeacherSchoolAssignment>> =>
  get<PaginatedResponse<TeacherSchoolAssignment>>(API_ENDPOINTS.TEACHER_SCHOOLS.PAGED, { params });

/** Assignment history / audit trail. */
const getAuditLog = (params: TeacherSchoolAuditLogQueryParams): Promise<PaginatedResponse<TeacherSchoolAuditLog>> =>
  get<PaginatedResponse<TeacherSchoolAuditLog>>(API_ENDPOINTS.TEACHER_SCHOOLS.AUDIT_LOG, { params });

/** Full-set sync used by the Teacher Create/Edit screen's multi-school selector. */
const syncTeacherSchools = (payload: TeacherSchoolAssignmentSetPayload): Promise<{ message: string }> =>
  post<{ message: string }>(API_ENDPOINTS.TEACHER_SCHOOLS.SYNC, payload);

/** Bulk-assign (or restore) one or more additional Schools to a Teacher. */
const assignToSchools = (payload: AssignTeacherToSchoolsPayload): Promise<TeacherSchoolBulkResult> =>
  post<TeacherSchoolBulkResult>(API_ENDPOINTS.TEACHER_SCHOOLS.ASSIGN, payload);

/** Soft-delete a single Teacher-School membership. */
const removeAssignment = (payload: RemoveTeacherSchoolPayload): Promise<{ message: string }> =>
  post<{ message: string }>(API_ENDPOINTS.TEACHER_SCHOOLS.REMOVE, payload);

/** Toggle a membership's Active/Inactive business status. */
const setStatus = (
  teacherId: string,
  schoolId: string,
  payload: UpdateTeacherSchoolStatusPayload,
): Promise<void> =>
  put<void>(API_ENDPOINTS.TEACHER_SCHOOLS.SET_STATUS(teacherId, schoolId), payload);

/** Mark one of a Teacher's Schools as their primary/home school. */
const setPrimary = (payload: SetPrimaryTeacherSchoolPayload): Promise<void> =>
  put<void>(API_ENDPOINTS.TEACHER_SCHOOLS.SET_PRIMARY, payload);

export const teacherSchoolService = {
  getMySchools,
  getByTeacher,
  getAvailableSchoolsForLogin,
  getPaged,
  getAuditLog,
  syncTeacherSchools,
  assignToSchools,
  removeAssignment,
  setStatus,
  setPrimary,
};
