/**
 * Role Constants
 *
 * Single source of truth for all user role identifiers used in the LXP.
 * Every permission check, route guard, sidebar nav filter, and role-based
 * conditional must reference these constants — never use raw strings.
 *
 * `ROLES` holds the frontend utype strings exactly as stored in localStorage
 * and returned by the auth API.  `ROLE_LABELS` provides human-readable labels
 * for display purposes.
 */

export const ROLES = {
  SUPER_ADMIN: "superadmin",
  ADMIN: "admin",
  PRINCIPAL: "principal",
  STAFF: "staff",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];

/** Human-readable display labels for each role. */
export const ROLE_LABELS: Record<RoleValue, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  principal: "Principal",
  staff: "Staff",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

/** Convenience groupings used in route guards and permission checks. */
export const ROLE_GROUPS = {
  /** All roles with administrative or management access. */
  ADMIN_LEVEL: [ROLES.SUPER_ADMIN, ROLES.ADMIN] as RoleValue[],
  /** Roles that can manage school-level content. */
  SCHOOL_MANAGERS: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PRINCIPAL,
    ROLES.STAFF,
  ] as RoleValue[],
  /** Roles that can view and manage student data. */
  EDUCATORS: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PRINCIPAL,
    ROLES.STAFF,
    ROLES.TEACHER,
  ] as RoleValue[],
  /** Roles with read-only / personal portal access. */
  LEARNERS: [ROLES.STUDENT, ROLES.PARENT] as RoleValue[],
  /** All authenticated roles. */
  ALL: Object.values(ROLES) as RoleValue[],
} as const;
