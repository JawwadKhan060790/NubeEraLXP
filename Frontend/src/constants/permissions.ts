/**
 * Permission Constants
 *
 * Defines what each role can do.  Use `hasPermission()` from
 * `src/utils/permissions.ts` to check these at the component level.
 *
 * Permission strings follow the pattern: `<module>:<action>`
 */

import { ROLES, type RoleValue } from './roles';

export const PERMISSIONS = {
  // ── School Management ─────────────────────────────────────────────────────
  SCHOOLS_VIEW:   'schools:view',
  SCHOOLS_CREATE: 'schools:create',
  SCHOOLS_EDIT:   'schools:edit',
  SCHOOLS_DELETE: 'schools:delete',

  // ── Teacher Management ────────────────────────────────────────────────────
  TEACHERS_VIEW:   'teachers:view',
  TEACHERS_CREATE: 'teachers:create',
  TEACHERS_EDIT:   'teachers:edit',
  TEACHERS_DELETE: 'teachers:delete',
  TEACHERS_APPROVE:'teachers:approve',

  // ── Student Management ────────────────────────────────────────────────────
  STUDENTS_VIEW:    'students:view',
  STUDENTS_CREATE:  'students:create',
  STUDENTS_EDIT:    'students:edit',
  STUDENTS_DELETE:  'students:delete',
  STUDENTS_PROMOTE: 'students:promote',

  // ── Grade Management ──────────────────────────────────────────────────────
  GRADES_VIEW:   'grades:view',
  GRADES_CREATE: 'grades:create',
  GRADES_EDIT:   'grades:edit',
  GRADES_DELETE: 'grades:delete',

  // ── Academics ────────────────────────────────────────────────────────────
  MODULES_VIEW:   'modules:view',
  MODULES_CREATE: 'modules:create',
  MODULES_EDIT:   'modules:edit',
  MODULES_DELETE: 'modules:delete',

  LESSONS_VIEW:   'lessons:view',
  LESSONS_CREATE: 'lessons:create',
  LESSONS_EDIT:   'lessons:edit',
  LESSONS_DELETE: 'lessons:delete',

  EXAMS_VIEW:   'exams:view',
  EXAMS_CREATE: 'exams:create',
  EXAMS_EDIT:   'exams:edit',
  EXAMS_DELETE: 'exams:delete',
  EXAMS_TAKE:   'exams:take',

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE_VIEW:   'attendance:view',
  ATTENDANCE_MARK:   'attendance:mark',
  ATTENDANCE_EDIT:   'attendance:edit',

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORTS_VIEW:   'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // ── Certificates ─────────────────────────────────────────────────────────
  CERTIFICATES_VIEW:     'certificates:view',
  CERTIFICATES_GENERATE: 'certificates:generate',
  CERTIFICATES_ADMIN:    'certificates:admin',

  // ── Report Cards ──────────────────────────────────────────────────────────
  REPORT_CARDS_VIEW:     'report_cards:view',
  REPORT_CARDS_GENERATE: 'report_cards:generate',
  REPORT_CARDS_ADMIN:    'report_cards:admin',

  // ── Support Tickets ────────────────────────────────────────────────────────
  TICKETS_VIEW:   'tickets:view',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_MANAGE: 'tickets:manage',

  // ── E-Commerce ────────────────────────────────────────────────────────────
  SHOP_VIEW:    'shop:view',
  SHOP_ADMIN:   'shop:admin',
  SHOP_PURCHASE:'shop:purchase',

  // ── Events ────────────────────────────────────────────────────────────────
  EVENTS_VIEW:   'events:view',
  EVENTS_CREATE: 'events:create',
  EVENTS_MANAGE: 'events:manage',

  // ── Admin ────────────────────────────────────────────────────────────────
  ADMIN_SETTINGS:  'admin:settings',
  ADMIN_BACKUP:    'admin:backup',
  ADMIN_USERS:     'admin:users',
  ADMIN_FULL:      'admin:full',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission matrix: maps each permission to the roles that have it.
 */
export const PERMISSION_MATRIX: Record<Permission, RoleValue[]> = {
  // Schools
  'schools:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL],
  'schools:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'schools:edit':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'schools:delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Teachers
  'teachers:view':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL],
  'teachers:create':  [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'teachers:edit':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'teachers:delete':  [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'teachers:approve': [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Students
  'students:view':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER],
  'students:create':  [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'students:edit':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'students:delete':  [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'students:promote': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Grades
  'grades:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER],
  'grades:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'grades:edit':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'grades:delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Modules
  'modules:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER, ROLES.STUDENT],
  'modules:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'modules:edit':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'modules:delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Lessons
  'lessons:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER, ROLES.STUDENT],
  'lessons:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'lessons:edit':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'lessons:delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Exams
  'exams:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER, ROLES.STUDENT],
  'exams:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'exams:edit':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'exams:delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'exams:take':   [ROLES.STUDENT],

  // Attendance
  'attendance:view': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER],
  'attendance:mark': [ROLES.TEACHER, ROLES.STAFF],
  'attendance:edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Reports
  'reports:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.STAFF, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'reports:export': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.STAFF, ROLES.TEACHER],

  // Certificates
  'certificates:view':     [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT],
  'certificates:generate': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'certificates:admin':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Report Cards
  'report_cards:view':     [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER],
  'report_cards:generate': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  'report_cards:admin':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Support Tickets
  'tickets:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'tickets:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'tickets:manage': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // E-Commerce
  'shop:view':     [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'shop:admin':    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'shop:purchase': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],

  // Events
  'events:view':   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'events:create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  'events:manage': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],

  // Admin
  'admin:settings': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'admin:backup':   [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'admin:users':    [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'admin:full':     [ROLES.SUPER_ADMIN],
};
