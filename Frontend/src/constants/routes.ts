/**
 * Route Constants
 *
 * Centralised path strings for the entire application.
 * Import from here instead of repeating literal strings across files so a
 * single rename stays consistent everywhere.
 */

export const ROUTES = {
  // ── Public ──────────────────────────────────────────────────────────────────
  LOGIN:        '/login',
  UNAUTHORIZED: '/unauthorized',

  // ── Dashboards ──────────────────────────────────────────────────────────────
  ADMIN_DASHBOARD:     '/admin/dashboard',
  PRINCIPAL_DASHBOARD: '/principal/dashboard',
  STAFF_DASHBOARD:     '/staff/dashboard',
  TEACHER_DASHBOARD:   '/teacher/dashboard',
  STUDENT_DASHBOARD:   '/student/dashboard',
  PARENT_DASHBOARD:    '/parent/dashboard',

  // ── Institution Management ────────────────────────────────────────────────
  SCHOOLS:  '/schools',
  TEACHERS: '/teachers',
  STUDENTS: '/students',
  GRADES:          '/grades',
  GRADE_SECTIONS:  '/grade-sections',
  STAFF_SECTIONS:  '/staff/grade-sections',
  USERS:           '/users',

  // ── Academics ────────────────────────────────────────────────────────────
  SUBJECTS: '/subjects',
  MODULES: '/modules',
  LESSONS: '/lessons',
  EXAMS:   '/exams',
  EVENTS:  '/events',

  // ── Reporting ────────────────────────────────────────────────────────────
  REPORTS:      '/reports',
  REPORT_VIEW:  '/reports/:key',

  // ── User Account ──────────────────────────────────────────────────────────
  UPDATE_PROFILE:  '/update-profile',
  CHANGE_PASSWORD: '/change-password',

  // ── Admin Management ─────────────────────────────────────────────────────
  CREATE_STAFF:         '/create-staff',
  CREATE_TEACHER:       '/create-teacher',
  ADMIN_SETTINGS:       '/admin/settings',
  ADMIN_BACKUP_RESTORE: '/admin/backup-restore',
  TEACHER_FEE_SETTING:  '/teacher/fee-setting',
  PENDING_TEACHERS:     '/pending-teachers',
  WEBSITE_REGISTRATIONS:'/admissions/registrations',

  // ── School-Based Curriculum & Multi-School Teacher Management ───────────
  CURRICULUM_ASSIGNMENT:      '/admin/curriculum-assignment',
  CURRICULUM_DASHBOARD:       '/admin/curriculum-dashboard',
  TEACHER_SCHOOL_ASSIGNMENT:  '/admin/teacher-school-assignment',

  // ── Staff Extended ────────────────────────────────────────────────────────
  STAFF_SCHOOLS:        '/staff/schools',
  STAFF_GRADES:         '/staff/grades',
  STAFF_MODULES:        '/staff/modules',
  STAFF_LESSONS:        '/staff/lessons',
  STAFF_EXAMS:          '/staff/exams',
  STAFF_QUESTIONS:      '/staff/modulequestion',
  STAFF_SCHEDULER:      '/staff/scheduler',

  // ── Teacher Extended ─────────────────────────────────────────────────────
  TEACHER_STUDENTS:   '/teacher/student-list',
  TEACHER_EXAMS:      '/teacher/exams',
  TEACHER_QUESTIONS:  '/teacher/examquestion',
  TEACHER_SCHEDULER:  '/teacher/schedulerstatus',
  TEACHER_CALENDAR:   '/teacher/teacher-calender',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  ATTENDANCE:                  '/attendance',          // unified hub
  STUDENT_ATTENDANCE:          '/student-attendance',  // legacy → redirect
  TEACHER_ATTENDANCE_REGISTRY: '/teacher-attendance',  // legacy → redirect

  // ── Teacher Enhancement Module ────────────────────────────────────────────
  TEACHER_LEARNING_PATH:      '/teacher/learning-path',
  TEACHER_TEACHING_PATH:      '/teacher/teaching-path',
  TEACHER_SCHEDULE_CALENDAR:  '/teacher/schedule-calendar',
  TEACHER_GRADE_STUDENTS:     '/teacher/grade-students',
  TEACHER_STUDENT_WEAKNESS:   '/teacher/student-weakness',
  TEACHER_SYLLABUS_COMPLETION:'/teacher/syllabus-completion',

  // ── Student ───────────────────────────────────────────────────────────────
  STUDENT_LEARNING: '/student/learning',
  STUDENT_CALENDAR: '/student/calendar',
  PARENT_CHILD_CALENDAR: '/parent/child-calendar/:studentId',

  // ── Certificates ─────────────────────────────────────────────────────────
  CERTIFICATES_HUB:  '/certificates/admin',
  MY_CERTIFICATES:   '/certificates/my',
  CERTIFICATES_GENERATE: '/certificates/generate',
  CERTIFICATES_BULK:     '/certificates/bulk',

  // ── Report Cards ─────────────────────────────────────────────────────────
  REPORT_CARDS_HUB:     '/report-cards/admin',
  GENERATE_REPORT_CARD: '/report-cards/generate',
  REPORT_CARD_PREVIEW:  '/report-cards/preview/:id',
  MY_REPORT_CARDS:      '/report-cards/my',
  CHILD_REPORT_CARDS:   '/report-cards/child',

  // ── Equipment Hub (E-Commerce) ────────────────────────────────────────────
  SHOP_HOME:           '/shop',
  SHOP_PRODUCTS:       '/shop/products',
  SHOP_PRODUCT_DETAIL: '/shop/products/:id',
  SHOP_CART:           '/shop/cart',
  SHOP_WISHLIST:       '/shop/wishlist',
  SHOP_CHECKOUT:       '/shop/checkout',
  SHOP_ORDER_SUCCESS:  '/shop/orders/success',
  SHOP_ORDER_TRACKING: '/shop/orders/tracking/:id',
  SHOP_ORDERS:         '/shop/orders',
  SHOP_ADMIN:          '/shop/admin',

  // ── Recycle Bin ───────────────────────────────────────────────────────────
  RECYCLE_BIN: '/admin/recycle-bin',
  DATA_IMPORT: '/data-import',

  // ── Support Tickets ────────────────────────────────────────────────────────
  SUPPORT_TICKETS:       '/support/tickets',
  SUPPORT_RAISE_TICKET:  '/support/raise-ticket',
  SUPPORT_TICKET_DETAIL: '/support/tickets/:id',
  SUPPORT_ANALYTICS:     '/support/analytics',

  // ── Doubt Hub ──────────────────────────────────────────────────────────────
  STUDENT_DOUBT_HUB:     '/student/doubt-hub',
  TEACHER_DOUBT_HUB:     '/teacher/doubt-hub',
  ADMIN_DOUBT_HUB:       '/admin/doubt-hub',
} as const;

export type RouteValue = (typeof ROUTES)[keyof typeof ROUTES];
