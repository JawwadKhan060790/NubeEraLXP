import { get } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';

export interface StudentCalendarEvent {
  id: string;
  type: 'Class' | 'Exam' | 'Event';
  title: string;
  description: string;
  start: string;
  end: string;
  color: string;
  status: string;
  subjectName?: string;
  teacherName?: string;
  venue?: string;
}

export const getStudentCalendar = (
  studentId: string,
  start?: string,
  end?: string
): Promise<StudentCalendarEvent[]> => {
  let url = API_ENDPOINTS.STUDENTS.CALENDAR(studentId);
  const params: string[] = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  return get<StudentCalendarEvent[]>(url);
};

export const studentCalendarService = {
  getStudentCalendar,
};
