/**
 * Student Service
 *
 * All student-related API calls.  Components must import this service.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Student,
  StudentCreatePayload,
  StudentUpdatePayload,
  StudentPromotePayload,
  StudentRolloverPayload,
} from '../types/student.types';

/** Fetches all students visible to the current user. */
const getStudents = (): Promise<Student[]> =>
  get<Student[]>(API_ENDPOINTS.STUDENTS.BASE);

/** Fetches a single student by ID. */
const getStudent = (id: string): Promise<Student> =>
  get<Student>(API_ENDPOINTS.STUDENTS.BY_ID(id));

/** Creates a new student account. */
const createStudent = (payload: StudentCreatePayload): Promise<Student> =>
  post<Student>(API_ENDPOINTS.STUDENTS.BASE, payload);

/** Updates an existing student. */
const updateStudent = (id: string, payload: StudentUpdatePayload): Promise<Student> =>
  put<Student>(API_ENDPOINTS.STUDENTS.BY_ID(id), payload);

/** Deletes a student by ID. */
const deleteStudent = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.STUDENTS.BY_ID(id));

/** Promotes students to the next academic year in a school. */
const promoteStudents = (payload: StudentPromotePayload): Promise<{ message: string }> =>
  post(API_ENDPOINTS.STUDENTS.PROMOTE, payload);

/** Rolls over students for a new academic year without promotion. */
const rolloverStudents = (payload: StudentRolloverPayload): Promise<{ message: string }> =>
  post(API_ENDPOINTS.STUDENTS.ROLLOVER, payload);

export const studentService = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  promoteStudents,
  rolloverStudents,
};
