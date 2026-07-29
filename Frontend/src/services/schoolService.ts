/**
 * School Service
 *
 * Centralised API calls for Schools and Grades.
 * Import and use this service instead of calling apiClient directly in components.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  School, SchoolCreatePayload, SchoolUpdatePayload,
  Grade,  GradeCreatePayload,  GradeUpdatePayload,
} from '../types/school.types';

// ── Schools ───────────────────────────────────────────────────────────────────

/** Fetches all schools visible to the current user. */
const getSchools = (): Promise<School[]> =>
  get<School[]>(API_ENDPOINTS.SCHOOLS.BASE);

/** Fetches a single school by ID. */
const getSchool = (id: string): Promise<School> =>
  get<School>(API_ENDPOINTS.SCHOOLS.BY_ID(id));

/** Creates a new school. */
const createSchool = (payload: SchoolCreatePayload): Promise<School> =>
  post<School>(API_ENDPOINTS.SCHOOLS.BASE, payload);

/** Updates an existing school. */
const updateSchool = (id: string, payload: SchoolUpdatePayload): Promise<School> =>
  put<School>(API_ENDPOINTS.SCHOOLS.BY_ID(id), payload);

/** Deletes a school by ID. */
const deleteSchool = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.SCHOOLS.BY_ID(id));

// ── Grades ────────────────────────────────────────────────────────────────────

/** Fetches all grades (optionally filtered by school). */
const getGrades = (): Promise<Grade[]> =>
  get<Grade[]>(API_ENDPOINTS.GRADES.BASE);

/** Fetches a single grade by ID. */
const getGrade = (id: string): Promise<Grade> =>
  get<Grade>(API_ENDPOINTS.GRADES.BY_ID(id));

/** Creates a new grade. */
const createGrade = (payload: GradeCreatePayload): Promise<Grade> =>
  post<Grade>(API_ENDPOINTS.GRADES.BASE, payload);

/** Updates an existing grade. */
const updateGrade = (id: string, payload: GradeUpdatePayload): Promise<Grade> =>
  put<Grade>(API_ENDPOINTS.GRADES.BY_ID(id), payload);

/** Deletes a grade by ID. */
const deleteGrade = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.GRADES.BY_ID(id));

export const schoolService = {
  getSchools, getSchool, createSchool, updateSchool, deleteSchool,
};

export const gradeService = {
  getGrades, getGrade, createGrade, updateGrade, deleteGrade,
};
