/**
 * teacherRatingService.ts
 *
 * Lets a Student rate/give feedback on the teachers who teach their grade,
 * from the Student Dashboard. Mirrors the backend TeacherRatingDtos
 * (snake_case — global SnakeCaseLower JSON naming policy).
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface RatableTeacher {
  teacher_id: string;
  teacher_name: string;
  subject?: string | null;
  is_class_teacher: boolean;
  /** Null if the student hasn't rated this teacher yet. */
  my_rating?: number | null;
  my_comment?: string | null;
}

export interface TeacherRatingResult {
  id: string;
  teacher_id: string;
  teacher_name: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_date?: string | null;
}

/** Teachers the logged-in student can rate, with their existing rating (if any). */
const getMyTeachers = async (): Promise<RatableTeacher[]> => {
  const response = await api.get(API_ENDPOINTS.TEACHER_RATINGS.MY_TEACHERS);
  return response.data;
};

/** Submit (or update) a 1-5 star rating + optional comment for a teacher. */
const submitRating = async (
  teacherId: string,
  rating: number,
  comment?: string
): Promise<TeacherRatingResult> => {
  const response = await api.post(API_ENDPOINTS.TEACHER_RATINGS.SUBMIT, {
    teacher_id: teacherId,
    rating,
    comment,
  });
  return response.data;
};

export const teacherRatingService = {
  getMyTeachers,
  submitRating,
};
