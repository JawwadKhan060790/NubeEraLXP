import api from './api';

// ─── Types (snake_case — matches API JsonNamingPolicy.SnakeCaseLower) ─────────

export interface CertificateTemplate {
  id: string;
  name: string;
  program_type: string;
  grade_band: string;
  certificate_title: string;
  tagline?: string;
  default_principal_name?: string;
  default_principal_designation?: string;
  default_director_name?: string;
  default_director_designation?: string;
  default_staff_name?: string;
  default_staff_designation?: string;
  is_active: boolean;
  school_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CertificateListItem {
  id: string;
  certificate_number: string;
  student_name: string;
  grade_name: string;
  school_name: string;
  course_name: string;
  program_type: string;
  academic_year: string;
  completion_date: string;
  status: string;
  is_available_to_student: boolean;
  issued_at?: string;
  download_count: number;
  performance_level?: string;
  percentage?: number;
}

export interface CertificateDto {
  id: string;
  certificate_number: string;
  student_id: string;
  school_id: string;
  template_id?: string;
  template_name?: string;
  student_name: string;
  student_id_number: string;
  grade_name: string;
  grade_level: number;
  school_name: string;
  course_name: string;
  program_type: string;
  academic_year: string;
  completion_date: string;
  percentage?: number;
  performance_level?: string;
  remarks?: string;
  status: string;
  is_available_to_student: boolean;
  qr_code_data?: string;
  issued_at?: string;
  revoked_at?: string;
  revocation_reason?: string;
  download_count: number;
  last_downloaded_at?: string;
  principal_name?: string;
  principal_designation?: string;
  director_name?: string;
  director_designation?: string;
  staff_name?: string;
  staff_designation?: string;
  created_at: string;
  updated_at?: string;
}

export interface CertificateCreateDto {
  student_id: string;
  school_id: string;
  template_id?: string;
  course_name: string;
  program_type: string;
  academic_year: string;
  completion_date: string;
  percentage?: number;
  performance_level?: string;
  remarks?: string;
  principal_name?: string;
  principal_designation?: string;
  director_name?: string;
  director_designation?: string;
  staff_name?: string;
  staff_designation?: string;
}

export interface BulkCertificateCreateDto {
  student_ids: string[];
  school_id: string;
  template_id?: string;
  course_name: string;
  program_type: string;
  academic_year: string;
  completion_date: string;
  performance_level?: string;
  remarks?: string;
  principal_name?: string;
  principal_designation?: string;
  director_name?: string;
  director_designation?: string;
  staff_name?: string;
  staff_designation?: string;
}

export interface CertificateApproveDto {
  approve: boolean;
  make_available_to_student?: boolean;
  rejection_reason?: string;
}

export interface CertificateRevokeDto {
  reason: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

// Templates
export const getTemplates = (schoolId?: string) =>
  api.get<CertificateTemplate[]>('/certificates/templates', { params: { schoolId } }).then(r => r.data);

export const createTemplate = (dto: Partial<CertificateTemplate>) =>
  api.post<CertificateTemplate>('/certificates/templates', dto).then(r => r.data);

export const updateTemplate = (id: string, dto: Partial<CertificateTemplate>) =>
  api.put<CertificateTemplate>(`/certificates/templates/${id}`, dto).then(r => r.data);

export const deleteTemplate = (id: string) =>
  api.delete(`/certificates/templates/${id}`);

// Certificates — admin/staff
export const getAllCertificates = (params?: { status?: string; schoolId?: string; search?: string }) =>
  api.get<CertificateListItem[]>('/certificates', { params }).then(r => r.data);

export const getCertificateById = (id: string) =>
  api.get<CertificateDto>(`/certificates/${id}`).then(r => r.data);

export const createCertificate = (dto: CertificateCreateDto) =>
  api.post<CertificateDto>('/certificates', dto).then(r => r.data);

export const bulkCreateCertificates = (dto: BulkCertificateCreateDto) =>
  api.post<CertificateDto[]>('/certificates/bulk', dto).then(r => r.data);

export const updateCertificate = (id: string, dto: Partial<CertificateCreateDto>) =>
  api.put<CertificateDto>(`/certificates/${id}`, dto).then(r => r.data);

export const approveCertificate = (id: string, dto: CertificateApproveDto) =>
  api.post<CertificateDto>(`/certificates/${id}/approve`, dto).then(r => r.data);

export const revokeCertificate = (id: string, dto: CertificateRevokeDto) =>
  api.post<CertificateDto>(`/certificates/${id}/revoke`, dto).then(r => r.data);

export const reissueCertificate = (id: string) =>
  api.post<CertificateDto>(`/certificates/${id}/reissue`).then(r => r.data);

export const deleteCertificate = (id: string) =>
  api.delete(`/certificates/${id}`);

// Student / Parent views
export const getMyCertificates = () =>
  api.get<CertificateListItem[]>('/certificates/my').then(r => r.data);

export const getChildCertificates = () =>
  api.get<CertificateListItem[]>('/certificates/children').then(r => r.data);

// Download — returns blob URL for the PDF
export const downloadCertificatePdf = async (id: string, certNumber: string): Promise<void> => {
  const response = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Certificate_${certNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Public verification
export const verifyCertificate = (certNumber: string) =>
  api.get(`/certificates/verify/${certNumber}`).then(r => r.data);
