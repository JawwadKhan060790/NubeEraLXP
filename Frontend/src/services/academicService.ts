/**
 * Academic Service
 *
 * All academic content API calls: Modules, Lessons, Exams, Questions, Scheduler.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Module, ModuleCreatePayload, ModuleUpdatePayload,
  Lesson, LessonCreatePayload, LessonUpdatePayload,
  Exam,   ExamCreatePayload,   ExamUpdatePayload,
  Question, QuestionCreatePayload,
  SchedulerEntry,
  DashboardStats,
} from '../types/academic.types';

// ── Modules ────────────────────────────────────────────────────────────────────

const getModules = (): Promise<Module[]> =>
  get<Module[]>(API_ENDPOINTS.MODULES.BASE);

const getModule = (id: string): Promise<Module> =>
  get<Module>(API_ENDPOINTS.MODULES.BY_ID(id));

const createModule = (payload: ModuleCreatePayload): Promise<Module> =>
  post<Module>(API_ENDPOINTS.MODULES.BASE, payload);

const updateModule = (id: string, payload: ModuleUpdatePayload): Promise<Module> =>
  put<Module>(API_ENDPOINTS.MODULES.BY_ID(id), payload);

const deleteModule = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.MODULES.BY_ID(id));

// ── Lessons ────────────────────────────────────────────────────────────────────

const getLessons = (): Promise<Lesson[]> =>
  get<Lesson[]>(API_ENDPOINTS.LESSONS.BASE);

const getLesson = (id: string): Promise<Lesson> =>
  get<Lesson>(API_ENDPOINTS.LESSONS.BY_ID(id));

const createLesson = (payload: LessonCreatePayload | FormData): Promise<Lesson> =>
  post<Lesson>(API_ENDPOINTS.LESSONS.BASE, payload);

const updateLesson = (id: string, payload: LessonUpdatePayload | FormData): Promise<Lesson> =>
  put<Lesson>(API_ENDPOINTS.LESSONS.BY_ID(id), payload);

const deleteLesson = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.LESSONS.BY_ID(id));

// ── Exams ──────────────────────────────────────────────────────────────────────

const getExams = (): Promise<Exam[]> =>
  get<Exam[]>(API_ENDPOINTS.EXAMS.BASE);

const getExam = (id: string): Promise<Exam> =>
  get<Exam>(API_ENDPOINTS.EXAMS.BY_ID(id));

const createExam = (payload: ExamCreatePayload): Promise<Exam> =>
  post<Exam>(API_ENDPOINTS.EXAMS.BASE, payload);

const updateExam = (id: string, payload: ExamUpdatePayload): Promise<Exam> =>
  put<Exam>(API_ENDPOINTS.EXAMS.BY_ID(id), payload);

const deleteExam = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.EXAMS.BY_ID(id));

/** Submits a student's exam answers and returns the result. */
const submitExam = (examId: string, answers: Record<string, string>): Promise<unknown> =>
  post(API_ENDPOINTS.EXAMS.SUBMIT(examId), { answers });

// ── Questions ──────────────────────────────────────────────────────────────────

const getQuestions = (): Promise<Question[]> =>
  get<Question[]>(API_ENDPOINTS.QUESTIONS.BASE);

const createQuestion = (payload: QuestionCreatePayload): Promise<Question> =>
  post<Question>(API_ENDPOINTS.QUESTIONS.BASE, payload);

const deleteQuestion = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.QUESTIONS.BY_ID(id));

// ── Scheduler ─────────────────────────────────────────────────────────────────

const getScheduler = (): Promise<SchedulerEntry[]> =>
  get<SchedulerEntry[]>(API_ENDPOINTS.SCHEDULER.BASE);

const createSchedulerEntry = (payload: Partial<SchedulerEntry>): Promise<SchedulerEntry> =>
  post<SchedulerEntry>(API_ENDPOINTS.SCHEDULER.BASE, payload);

const updateSchedulerEntry = (id: string, payload: Partial<SchedulerEntry>): Promise<SchedulerEntry> =>
  put<SchedulerEntry>(API_ENDPOINTS.SCHEDULER.BY_ID(id), payload);

const deleteSchedulerEntry = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.SCHEDULER.BY_ID(id));

// ── Dashboard ─────────────────────────────────────────────────────────────────

const getDashboardStats = (): Promise<DashboardStats> =>
  get<DashboardStats>(API_ENDPOINTS.REPORTS.DASHBOARD);

export const moduleService  = { getModules, getModule, createModule, updateModule, deleteModule };
export const lessonService  = { getLessons, getLesson, createLesson, updateLesson, deleteLesson };
export const examService    = { getExams, getExam, createExam, updateExam, deleteExam, submitExam };
export const questionService= { getQuestions, createQuestion, deleteQuestion };
export const schedulerService = { getScheduler, createSchedulerEntry, updateSchedulerEntry, deleteSchedulerEntry };
export const dashboardService = { getDashboardStats };
