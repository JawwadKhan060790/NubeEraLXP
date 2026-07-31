/**
 * API Endpoint Constants
 *
 * All backend path segments are defined here.  Service files import these
 * rather than repeating strings, so renaming an endpoint only requires a
 * single change.
 *
 * Paths are relative to the API base URL configured in apiClient.ts.
 */

export const API_ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN:           '/auth/login',
    REGISTER:        '/auth/register',
    LOGOUT:          '/auth/logout',
    ME:              '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD:  '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  USERS: {
    BASE:             '/users',
    BY_ID:            (id: string) => `/users/${id}`,
    RESET_PASSWORD:   (id: string) => `/users/${id}/reset-password`,
    UPDATE_PROFILE:   '/users/profile',
    UPLOAD_AVATAR:    '/users/upload-avatar',
  },

  // ── Schools ───────────────────────────────────────────────────────────────
  SCHOOLS: {
    BASE:   '/schools',
    BY_ID:  (id: string) => `/schools/${id}`,
  },

  // ── Grades ───────────────────────────────────────────────────────────────
  GRADES: {
    BASE:   '/grades',
    BY_ID:  (id: string) => `/grades/${id}`,
  },

  // ── Grade Sections ────────────────────────────────────────────────────────
  GRADE_SECTIONS: {
    BASE:       '/grade-sections',
    BY_ID:      (id: string) => `/grade-sections/${id}`,
    BY_GRADE:   (gradeId: string) => `/grade-sections/by-grade/${gradeId}`,
    BY_SCHOOL:  (schoolId: string) => `/grade-sections/by-school/${schoolId}`,
  },

  // ── Teachers ──────────────────────────────────────────────────────────────
  TEACHERS: {
    BASE:              '/teachers',
    BY_ID:             (id: string) => `/teachers/${id}`,
    PENDING:           '/teachers/pending',
    APPROVE:           (id: string) => `/teachers/${id}/approve`,
    REJECT:            (id: string) => `/teachers/${id}/reject`,
    FEE_SETTINGS:      '/teachers/fee-settings',
  },

  // ── Students ──────────────────────────────────────────────────────────────
  STUDENTS: {
    BASE:     '/students',
    BY_ID:    (id: string) => `/students/${id}`,
    PROMOTE:  '/students/promote',
    ROLLOVER: '/students/rollover',
    CALENDAR: (id: string) => `/students/${id}/calendar`,
  },

  // ── Modules (Subjects) ────────────────────────────────────────────────────
  MODULES: {
    BASE:  '/modules',
    BY_ID: (id: string) => `/modules/${id}`,
  },

  // ── Lessons ───────────────────────────────────────────────────────────────
  LESSONS: {
    BASE:  '/lessons',
    BY_ID: (id: string) => `/lessons/${id}`,
  },

  // ── Exams ─────────────────────────────────────────────────────────────────
  EXAMS: {
    BASE:    '/exams',
    BY_ID:   (id: string) => `/exams/${id}`,
    SUBMIT:  (id: string) => `/exams/${id}/submit`,
  },

  // ── Questions ─────────────────────────────────────────────────────────────
  QUESTIONS: {
    BASE:  '/questions',
    BY_ID: (id: string) => `/questions/${id}`,
  },

  // ── Results ───────────────────────────────────────────────────────────────
  RESULTS: {
    BASE:  '/results',
    BY_ID: (id: string) => `/results/${id}`,
  },

  // ── Scheduler ─────────────────────────────────────────────────────────────
  SCHEDULER: {
    BASE:  '/scheduler',
    BY_ID: (id: string) => `/scheduler/${id}`,
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE: {
    STUDENTS: '/attendance/students',
    SAVE:     '/attendance/save',
    SUMMARY:  '/attendance/summary',
  },

  // ── Events ────────────────────────────────────────────────────────────────
  EVENTS: {
    BASE:        '/events',
    BY_ID:       (id: string) => `/events/${id}`,
    REGISTER:    (id: string) => `/events/${id}/register`,
    MY_EVENTS:   '/events/my-registrations',
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORTS: {
    BASE:      '/reports',
    BY_KEY:    (key: string) => `/reports/${key}`,
    EXPORT:    (key: string) => `/reports/${key}/export`,
    DASHBOARD: '/dashboard/stats',
  },

  // ── Certificates ──────────────────────────────────────────────────────────
  CERTIFICATES: {
    BASE:          '/certificates',
    BY_ID:         (id: string) => `/certificates/${id}`,
    TEMPLATES:     '/certificates/templates',
    GENERATE:      '/certificates/generate',
    MY:            '/certificates/my',
    DOWNLOAD:      (id: string) => `/certificates/${id}/download`,
  },

  // ── Report Cards ──────────────────────────────────────────────────────────
  REPORT_CARDS: {
    BASE:         '/report-cards',
    BY_ID:        (id: string) => `/report-cards/${id}`,
    GENERATE:     '/report-cards/generate',
    MY:           '/report-cards/my',
    CHILD:        '/report-cards/child',
    PREVIEW:      (id: string) => `/report-cards/${id}/preview`,
  },

  // ── E-Commerce ────────────────────────────────────────────────────────────
  ECOMMERCE: {
    PRODUCTS:       '/products',
    PRODUCT_BY_ID:  (id: string) => `/products/${id}`,
    CATEGORIES:     '/product-categories',
    CART:           '/cart',
    CART_ITEM:      (id: string) => `/cart/${id}`,
    WISHLIST:       '/wishlist',
    WISHLIST_ITEM:  (id: string) => `/wishlist/${id}`,
    ORDERS:         '/orders',
    ORDER_BY_ID:    (id: string) => `/orders/${id}`,
    CHECKOUT:       '/orders/checkout',
    DASHBOARD:      '/shop/dashboard',
  },

  // ── Support Tickets ────────────────────────────────────────────────────────
  SUPPORT: {
    TICKETS:        '/support/tickets',
    TICKET_BY_ID:   (id: string) => `/support/tickets/${id}`,
    COMMENTS:       (ticketId: string) => `/support/tickets/${ticketId}/comments`,
    ATTACHMENTS:    (ticketId: string) => `/support/tickets/${ticketId}/attachments`,
    CATEGORIES:     '/support/categories',
    ANALYTICS:      '/support/analytics',
    ASSIGN:         (id: string) => `/support/tickets/${id}/assign`,
    CLOSE:          (id: string) => `/support/tickets/${id}/close`,
  },

  // ── Website Registrations / Admissions ────────────────────────────────────
  ADMISSIONS: {
    REGISTRATIONS: '/admissions/registrations',
    BY_ID:         (id: string) => `/admissions/registrations/${id}`,
    APPROVE:       (id: string) => `/admissions/registrations/${id}/approve`,
  },

  // ── Teacher Learning Path ────────────────────────────────────────────────
  TEACHER_LEARNING_PATH: {
    BASE:               '/teacher/learning-path',
    BY_GRADE:           (gradeId: string, sectionId?: string) => `/teacher/learning-path/${gradeId}` + (sectionId ? `?sectionId=${sectionId}` : ''),
    UPDATE_STATUS:      '/teacher/learning-path/topic-status',
    SYLLABUS:           '/teacher/learning-path/syllabus-completion',
    GRADE_STUDENTS:     (gradeId: string, sectionId?: string) => `/teacher/learning-path/grade-students/${gradeId}` + (sectionId ? `?sectionId=${sectionId}` : ''),
    ENHANCED_DASHBOARD: '/teacher/learning-path/enhanced-dashboard',
  },

  // ── Teacher Schedule Periods ─────────────────────────────────────────────
  TEACHER_SCHEDULE_PERIODS: {
    DAILY:       '/teacher/schedule-periods/daily',
    WEEKLY:      '/teacher/schedule-periods/weekly',
    MONTHLY:     '/teacher/schedule-periods/monthly',
    UPDATE:      (schedulerId: string) => `/teacher/schedule-periods/${schedulerId}/status`,
    SEED_TODAY:  '/teacher/schedule-periods/seed-today',
  },

  // ── Teacher Rating (Student Dashboard "Rate Your Teacher") ───────────────
  TEACHER_RATINGS: {
    MY_TEACHERS: '/teacher-ratings/my-teachers',
    SUBMIT:      '/teacher-ratings',
  },

  // ── Teacher-School Assignment (multi-school Teacher membership) ──────────
  TEACHER_SCHOOLS: {
    MY_SCHOOLS:              '/teacher-schools/my-schools',
    BY_TEACHER:              (teacherId: string) => `/teacher-schools/by-teacher/${teacherId}`,
    AVAILABLE_FOR_LOGIN:     (teacherId: string) => `/teacher-schools/available-for-login/${teacherId}`,
    PAGED:                   '/teacher-schools/paged',
    AUDIT_LOG:               '/teacher-schools/audit-log',
    SYNC:                    '/teacher-schools/sync',
    ASSIGN:                  '/teacher-schools/assign',
    REMOVE:                  '/teacher-schools/remove',
    SET_STATUS:              (teacherId: string, schoolId: string) => `/teacher-schools/${teacherId}/${schoolId}/status`,
    SET_PRIMARY:             '/teacher-schools/set-primary',
  },

  // ── School Curriculum (master Unit/Topic catalog + School assignment) ────
  UNITS: {
    BASE:       '/units',
    SUMMARIES:  '/units/summaries',
    BY_ID:      (id: string) => `/units/${id}`,
    DELETE:     (id: string) => `/units/${id}`,
  },
  TOPICS: {
    BASE:       '/topics',
    SUMMARIES:  '/topics/summaries',
    BY_ID:      (id: string) => `/topics/${id}`,
    DELETE:     (id: string) => `/topics/${id}`,
  },
  SCHOOL_CURRICULUM: {
    CATALOG:         '/school-curriculum/catalog',
    SCHOOL_UNITS:    (schoolId: string) => `/school-curriculum/${schoolId}/units`,
    SCHOOL_TOPICS:   (schoolId: string) => `/school-curriculum/${schoolId}/topics`,
    DASHBOARD:       (schoolId: string) => `/school-curriculum/${schoolId}/dashboard`,
    AUDIT_LOG:       '/school-curriculum/audit-log',
    ASSIGN_UNITS:    '/school-curriculum/assign-units',
    ASSIGN_TOPICS:   '/school-curriculum/assign-topics',
    UNASSIGN_UNITS:  '/school-curriculum/unassign-units',
    UNASSIGN_TOPICS: '/school-curriculum/unassign-topics',
  },

  // ── Student Weakness Analysis ─────────────────────────────────────────────
  STUDENT_WEAKNESS: {
    BY_STUDENT:       (studentId: string) => `/teacher/student-weakness/student/${studentId}`,
    BY_GRADE:         (gradeId: string, sectionId?: string)   => `/teacher/student-weakness/grade/${gradeId}` + (sectionId ? `?sectionId=${sectionId}` : ''),
    CREATE:           '/teacher/student-weakness',
    RESOLVE:          (id: string)        => `/teacher/student-weakness/${id}/resolve`,
    SYNC_FROM_RESULTS:(gradeId: string)   => `/teacher/student-weakness/sync-from-results/${gradeId}`,
  },

  // ── AI ────────────────────────────────────────────────────────────────────
  AI: {
    CHAT: '/ai/chat',
  },

  // ── Backup ───────────────────────────────────────────────────────────────
  BACKUP: {
    DOWNLOAD:    '/backup/download',
    UPLOAD:      '/backup/upload',
    HISTORIES:   '/backup/histories',
    RESTORE:     '/backup/restore',
    SYSTEM_INFO: '/backup/system-info',
  },

  // ── Admin Settings ────────────────────────────────────────────────────────
  SETTINGS: {
    BASE:   '/settings',
    BY_KEY: (key: string) => `/settings/${key}`,
  },

  // ── File Upload ───────────────────────────────────────────────────────────
  UPLOAD: '/upload',
  UPLOAD_IMAGE: '/upload/image',

  // ── Parent ────────────────────────────────────────────────────────────────
  PARENT: {
    CHILDREN:    '/parent/children',
    CHILD_STATS: (childId: string) => `/parent/children/${childId}/stats`,
  },
} as const;
