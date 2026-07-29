/**
 * Section Service
 *
 * All Grade-Section API calls.
 * Sections live inside: School → Grade → Section (A, B, C …)
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GradeSection {
  id: string;
  school_id: string;
  school_name: string;
  grade_id: string;
  grade_name: string;
  grade_level: string;
  section_code: string;       // A, B, C …
  section_name: string | null;
  capacity: number;
  description: string | null;
  is_active: boolean;
  student_count: number;
  display_name: string;       // "Grade 1 - A" (computed by backend)
}

export interface GradeSectionCreatePayload {
  school_id: string;
  grade_id: string;
  section_code: string;
  section_name?: string;
  capacity?: number;
  description?: string;
}

export interface GradeSectionUpdatePayload {
  section_code: string;
  section_name?: string;
  capacity?: number;
  description?: string;
  is_active: boolean;
}

// ── API calls ──────────────────────────────────────────────────────────────────

/** All sections visible to the current user (tenant-scoped by backend). */
const getSections = (): Promise<GradeSection[]> =>
  get<GradeSection[]>(API_ENDPOINTS.GRADE_SECTIONS.BASE);

/** Sections for a specific grade. */
const getSectionsByGrade = (gradeId: string): Promise<GradeSection[]> =>
  get<GradeSection[]>(API_ENDPOINTS.GRADE_SECTIONS.BY_GRADE(gradeId));

/** Sections for a school, optionally filtered by grade. */
const getSectionsBySchool = (schoolId: string, gradeId?: string): Promise<GradeSection[]> => {
  const url = API_ENDPOINTS.GRADE_SECTIONS.BY_SCHOOL(schoolId);
  return get<GradeSection[]>(gradeId ? `${url}?gradeId=${gradeId}` : url);
};

/** Single section by ID. */
const getSection = (id: string): Promise<GradeSection> =>
  get<GradeSection>(API_ENDPOINTS.GRADE_SECTIONS.BY_ID(id));

/** Create a new section. */
const createSection = (payload: GradeSectionCreatePayload): Promise<{ id: string; message: string }> =>
  post(API_ENDPOINTS.GRADE_SECTIONS.BASE, payload);

/** Update a section. */
const updateSection = (id: string, payload: GradeSectionUpdatePayload): Promise<void> =>
  put(API_ENDPOINTS.GRADE_SECTIONS.BY_ID(id), payload);

/** Soft-delete a section. */
const deleteSection = (id: string): Promise<void> =>
  del(API_ENDPOINTS.GRADE_SECTIONS.BY_ID(id));

export const sectionService = {
  getSections,
  getSectionsByGrade,
  getSectionsBySchool,
  getSection,
  createSection,
  updateSection,
  deleteSection,
};
