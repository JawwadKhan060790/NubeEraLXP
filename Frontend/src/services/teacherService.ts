/**
 * Teacher Service
 *
 * All teacher-related API calls.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Teacher,
  TeacherCreatePayload,
  TeacherUpdatePayload,
} from '../types/teacher.types';

/** Fetches all teachers visible to the current user. */
const getTeachers = (): Promise<Teacher[]> =>
  get<Teacher[]>(API_ENDPOINTS.TEACHERS.BASE);

/** Fetches pending (unapproved) teacher registrations. */
const getPendingTeachers = (): Promise<Teacher[]> =>
  get<Teacher[]>(API_ENDPOINTS.TEACHERS.PENDING);

/** Fetches a single teacher by ID. */
const getTeacher = (id: string): Promise<Teacher> =>
  get<Teacher>(API_ENDPOINTS.TEACHERS.BY_ID(id));

/** Creates a new teacher account. */
const createTeacher = (payload: TeacherCreatePayload): Promise<Teacher> =>
  post<Teacher>(API_ENDPOINTS.TEACHERS.BASE, payload);

/** Updates an existing teacher. */
const updateTeacher = (id: string, payload: TeacherUpdatePayload): Promise<Teacher> =>
  put<Teacher>(API_ENDPOINTS.TEACHERS.BY_ID(id), payload);

/** Deletes a teacher by ID. */
const deleteTeacher = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.TEACHERS.BY_ID(id));

/** Approves a pending teacher registration. */
const approveTeacher = (id: string): Promise<{ message: string }> =>
  put(API_ENDPOINTS.TEACHERS.APPROVE(id));

/** Rejects a pending teacher registration. */
const rejectTeacher = (id: string): Promise<{ message: string }> =>
  put(API_ENDPOINTS.TEACHERS.REJECT(id));

export const teacherService = {
  getTeachers,
  getPendingTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  approveTeacher,
  rejectTeacher,
};
