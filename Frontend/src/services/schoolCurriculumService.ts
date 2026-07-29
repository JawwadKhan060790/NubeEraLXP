/**
 * School Curriculum Assignment Service
 *
 * Backs Requirement 1 (assign/unassign master Units/Topics to Schools),
 * Requirement 7.1 (Admin Curriculum Assignment screen) and Requirement 7.3
 * (School Curriculum Dashboard). Admin/Staff only — Schools never assign
 * their own curriculum.
 */

import { get, post } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  SchoolUnitAssignment,
  SchoolTopicAssignment,
  SchoolCurriculumCatalogItem,
  SchoolCurriculumCatalogQueryParams,
  SchoolCurriculumDashboard,
  CurriculumAssignmentAuditLog,
  CurriculumAssignmentAuditLogQueryParams,
  AssignUnitsToSchoolPayload,
  AssignTopicsToSchoolPayload,
  UnassignUnitsFromSchoolPayload,
  UnassignTopicsFromSchoolPayload,
  BulkCurriculumAssignmentResult,
} from '../types/curriculum.types';
import type { PaginatedResponse } from '../types/common.types';

/** Combined Unit+Topic catalog with assigned/unassigned flag, scoped to one School. */
const getCatalog = (
  params: SchoolCurriculumCatalogQueryParams,
): Promise<PaginatedResponse<SchoolCurriculumCatalogItem>> =>
  get<PaginatedResponse<SchoolCurriculumCatalogItem>>(API_ENDPOINTS.SCHOOL_CURRICULUM.CATALOG, { params });

const getSchoolUnits = (schoolId: string): Promise<SchoolUnitAssignment[]> =>
  get<SchoolUnitAssignment[]>(API_ENDPOINTS.SCHOOL_CURRICULUM.SCHOOL_UNITS(schoolId));

const getSchoolTopics = (schoolId: string): Promise<SchoolTopicAssignment[]> =>
  get<SchoolTopicAssignment[]>(API_ENDPOINTS.SCHOOL_CURRICULUM.SCHOOL_TOPICS(schoolId));

const getDashboard = (schoolId: string): Promise<SchoolCurriculumDashboard> =>
  get<SchoolCurriculumDashboard>(API_ENDPOINTS.SCHOOL_CURRICULUM.DASHBOARD(schoolId));

const getAuditLog = (
  params: CurriculumAssignmentAuditLogQueryParams,
): Promise<PaginatedResponse<CurriculumAssignmentAuditLog>> =>
  get<PaginatedResponse<CurriculumAssignmentAuditLog>>(API_ENDPOINTS.SCHOOL_CURRICULUM.AUDIT_LOG, { params });

const assignUnits = (payload: AssignUnitsToSchoolPayload): Promise<BulkCurriculumAssignmentResult> =>
  post<BulkCurriculumAssignmentResult>(API_ENDPOINTS.SCHOOL_CURRICULUM.ASSIGN_UNITS, payload);

const assignTopics = (payload: AssignTopicsToSchoolPayload): Promise<BulkCurriculumAssignmentResult> =>
  post<BulkCurriculumAssignmentResult>(API_ENDPOINTS.SCHOOL_CURRICULUM.ASSIGN_TOPICS, payload);

const unassignUnits = (payload: UnassignUnitsFromSchoolPayload): Promise<BulkCurriculumAssignmentResult> =>
  post<BulkCurriculumAssignmentResult>(API_ENDPOINTS.SCHOOL_CURRICULUM.UNASSIGN_UNITS, payload);

const unassignTopics = (payload: UnassignTopicsFromSchoolPayload): Promise<BulkCurriculumAssignmentResult> =>
  post<BulkCurriculumAssignmentResult>(API_ENDPOINTS.SCHOOL_CURRICULUM.UNASSIGN_TOPICS, payload);

export const schoolCurriculumService = {
  getCatalog,
  getSchoolUnits,
  getSchoolTopics,
  getDashboard,
  getAuditLog,
  assignUnits,
  assignTopics,
  unassignUnits,
  unassignTopics,
};
