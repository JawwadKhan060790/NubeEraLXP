import api from './api';

// ─── Sub-entity types ─────────────────────────────────────────────────────────

export interface ReportCardSubjectDto {
  id: string;
  subject_name: string;
  max_marks: number;
  obtained_marks: number;
  grade?: string;
  remarks?: string;
  sort_order: number;
}

export interface ReportCardActivityDto {
  id: string;
  activity_name: string;
  rating?: string;
  remarks?: string;
  sort_order: number;
}

export interface ReportCardSkillDto {
  id: string;
  skill_name: string;
  rating: number;   // 1–5
  remarks?: string;
  sort_order: number;
}

// ─── Main DTOs ────────────────────────────────────────────────────────────────

export interface ReportCardListItem {
  id: string;
  report_card_number: string;
  student_name: string;
  student_id_number: string;
  grade_name: string;
  school_name: string;
  academic_year: string;
  exam_type: string;
  exam_name?: string;
  percentage: number;
  overall_grade?: string;
  is_passed: boolean;
  status: string;        // Draft | Published | Archived
  is_visible_to_student: boolean;
  is_visible_to_parent: boolean;
  published_at?: string;
  created_at: string;
  // Optional summary fields (populated in some contexts)
  obtained_marks?: number;
  total_marks?: number;
  rank?: number;
}

export interface ReportCardDto extends ReportCardListItem {
  student_id: string;
  school_id: string;
  grade_id: string;
  roll_no?: string;
  section?: string;
  school_address?: string;
  school_logo_url?: string;
  school_contact?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_contact?: string;
  total_marks: number;
  obtained_marks: number;
  gpa?: number;
  rank?: number;
  total_working_days?: number;
  days_present?: number;
  days_absent?: number;
  attendance_percentage?: number;
  teacher_remarks?: string;
  principal_remarks?: string;
  qr_code_data?: string;
  download_count: number;
  last_downloaded_at?: string;
  updated_at?: string;
  exam_date?: string;
  subjects: ReportCardSubjectDto[];
  activities: ReportCardActivityDto[];
  skills: ReportCardSkillDto[];
}

export interface ReportCardGradingRuleDto {
  id: string;
  school_id?: string;
  min_percentage: number;
  max_percentage: number;
  grade_letter: string;
  gpa_value?: number;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface SubjectInput {
  subject_name: string;
  max_marks: number;
  obtained_marks: number;
  remarks?: string;
  sort_order?: number;
}

export interface ActivityInput {
  activity_name: string;
  rating?: string;
  remarks?: string;
  sort_order?: number;
}

export interface SkillInput {
  skill_name: string;
  rating: number;
  remarks?: string;
  sort_order?: number;
}

export interface GenerateReportCardDto {
  student_id: string;
  school_id: string;
  grade_id: string;
  academic_year: string;
  exam_type: string;
  exam_name?: string;
  exam_date?: string;
  total_working_days?: number;
  days_present?: number;
  teacher_remarks?: string;
  principal_remarks?: string;
  subjects: SubjectInput[];
  activities?: ActivityInput[];
  skills?: SkillInput[];
}

export interface StudentReportInput {
  student_id: string;
  subjects: SubjectInput[];
  activities?: ActivityInput[];
  skills?: SkillInput[];
  teacher_remarks?: string;
}

export interface BulkGenerateReportCardDto {
  school_id: string;
  grade_id: string;
  academic_year: string;
  exam_type: string;
  exam_name?: string;
  exam_date?: string;
  total_working_days?: number;
  students: StudentReportInput[];
}

export interface BulkGenerateResultDto {
  generated: number;
  skipped: number;
  errors: string[];
}

export interface UpdateReportCardDto {
  exam_name?: string;
  exam_date?: string;
  total_working_days?: number;
  days_present?: number;
  teacher_remarks?: string;
  principal_remarks?: string;
  subjects?: SubjectInput[];
  activities?: ActivityInput[];
  skills?: SkillInput[];
}

// ─── Exam-results prefill (auto-generate subject list from existing results) ──

export interface ExamResultForReportCard {
  exam_id: string;
  exam_title: string;
  /** Module (subject) name — e.g. "Mathematics" */
  subject_name: string;
  max_marks: number;
  obtained_marks: number;
  grade?: string;
  remarks?: string;
  exam_date: string;
}

export interface PublishReportCardDto {
  is_visible_to_student: boolean;
  is_visible_to_parent: boolean;
}

export interface UpsertGradingRuleDto {
  min_percentage: number;
  max_percentage: number;
  grade_letter: string;
  gpa_value?: number;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

// List
export const getAllReportCards = (params?: {
  schoolId?: string;
  status?: string;
  academicYear?: string;
  examType?: string;
  search?: string;
}) => api.get<ReportCardListItem[]>('/report-cards', { params }).then(r => r.data);

// Single
export const getReportCardById = (id: string) =>
  api.get<ReportCardDto>(`/report-cards/${id}`).then(r => r.data);

// Student own
export const getMyReportCards = () =>
  api.get<ReportCardListItem[]>('/report-cards/student/me').then(r => r.data);

// Student by id (staff/teacher)
export const getStudentReportCards = (studentId: string) =>
  api.get<ReportCardListItem[]>(`/report-cards/student/${studentId}`).then(r => r.data);

// Parent
export const getParentReportCards = () =>
  api.get<ReportCardListItem[]>('/report-cards/parent/me').then(r => r.data);

// Generate
export const generateReportCard = (dto: GenerateReportCardDto) =>
  api.post<ReportCardDto>('/report-cards/generate', dto).then(r => r.data);

export const bulkGenerateReportCards = (dto: BulkGenerateReportCardDto) =>
  api.post<BulkGenerateResultDto>('/report-cards/bulk-generate', dto).then(r => r.data);

// Update
export const updateReportCard = (id: string, dto: UpdateReportCardDto) =>
  api.put<ReportCardDto>(`/report-cards/${id}`, dto).then(r => r.data);

// Delete
export const deleteReportCard = (id: string) =>
  api.delete(`/report-cards/${id}`);

// Workflow
export const publishReportCard = (id: string, dto: PublishReportCardDto) =>
  api.post<ReportCardDto>(`/report-cards/${id}/publish`, dto).then(r => r.data);

export const unpublishReportCard = (id: string) =>
  api.post<ReportCardDto>(`/report-cards/${id}/unpublish`).then(r => r.data);

export const archiveReportCard = (id: string) =>
  api.post<ReportCardDto>(`/report-cards/${id}/archive`).then(r => r.data);

// PDF download
export const downloadReportCardPdf = async (id: string, reportNumber: string, studentName: string): Promise<void> => {
  const response = await api.get(`/report-cards/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ReportCard_${reportNumber}_${studentName.replace(/\s+/g, '_')}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Grading rules
export const getGradingRules = (schoolId?: string) =>
  api.get<ReportCardGradingRuleDto[]>('/report-cards/grading-rules', { params: { schoolId } }).then(r => r.data);

export const createGradingRule = (schoolId: string | undefined, dto: UpsertGradingRuleDto) =>
  api.post<ReportCardGradingRuleDto>('/report-cards/grading-rules', dto, { params: { schoolId } }).then(r => r.data);

export const updateGradingRule = (id: string, dto: UpsertGradingRuleDto) =>
  api.put<ReportCardGradingRuleDto>(`/report-cards/grading-rules/${id}`, dto).then(r => r.data);

export const deleteGradingRule = (id: string) =>
  api.delete(`/report-cards/grading-rules/${id}`);

// Exam results prefill — fetch a student's published results enriched with subject/module data
export const getExamResultsForStudent = (studentId: string, gradeId?: string) =>
  api.get<ExamResultForReportCard[]>(`/results/student/${studentId}`, {
    params: gradeId ? { gradeId } : undefined,
  }).then(r => r.data);
