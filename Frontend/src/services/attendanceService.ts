/**
 * Attendance Service
 *
 * API calls for taking and querying student attendance.
 */

import { get, post } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
}

export interface AttendanceSavePayload {
  grade_id: string;
  date: string;
  records: AttendanceRecord[];
}

/** Fetches attendance records for a grade on a specific date. */
const getAttendanceForGrade = (gradeId: string, date: string): Promise<AttendanceRecord[]> =>
  get<AttendanceRecord[]>(`${API_ENDPOINTS.ATTENDANCE.STUDENTS}?gradeId=${gradeId}&date=${date}`);

/** Saves bulk attendance for a grade on a date. */
const saveAttendance = (payload: AttendanceSavePayload): Promise<{ message: string }> =>
  post(API_ENDPOINTS.ATTENDANCE.SAVE, payload);

/** Fetches attendance summary for reporting. */
const getAttendanceSummary = (params?: Record<string, string>): Promise<unknown> => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return get(`${API_ENDPOINTS.ATTENDANCE.SUMMARY}${qs}`);
};

export const attendanceService = {
  getAttendanceForGrade,
  saveAttendance,
  getAttendanceSummary,
};
