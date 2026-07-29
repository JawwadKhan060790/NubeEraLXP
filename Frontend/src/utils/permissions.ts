/**
 * permissions.ts — Permission check utilities
 *
 * Thin wrappers around PERMISSIONS / PERMISSION_MATRIX that can be used
 * OUTSIDE React components (e.g. in service functions, route guards, utility
 * code). For component-level checks, prefer the usePermissions() hook.
 *
 * Usage:
 *   import { userCan, userIsRole } from '@/utils/permissions';
 *   if (userCan('students:create', user?.utype)) { ... }
 */

import { PERMISSION_MATRIX, type Permission } from '@/constants/permissions';
import { ROLE_GROUPS, type RoleValue }         from '@/constants/roles';

/**
 * Returns true when `role` is in the allowed-roles list for `permission`.
 * Gracefully handles missing / unknown inputs.
 */
export const userCan = (
  permission: Permission,
  role: string | null | undefined,
): boolean => {
  if (!role) return false;
  const allowed = PERMISSION_MATRIX[permission];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(role.toLowerCase());
};

/**
 * Returns true when `role` matches any of the provided roles.
 * Case-insensitive.
 */
export const userIsRole = (
  role: string | null | undefined,
  ...roles: RoleValue[]
): boolean => {
  if (!role) return false;
  return roles.map((r) => r.toLowerCase()).includes(role.toLowerCase() as RoleValue);
};

/** True when the user has admin or superadmin role. */
export const isAdminLevel = (role: string | null | undefined): boolean =>
  userIsRole(role, ...(ROLE_GROUPS.ADMIN_LEVEL as RoleValue[]));

/** True when the user is a school manager (admin, superadmin, principal, staff). */
export const isSchoolManager = (role: string | null | undefined): boolean =>
  userIsRole(role, ...(ROLE_GROUPS.SCHOOL_MANAGERS as RoleValue[]));

/** True when the user is an educator (admin, superadmin, principal, staff, teacher). */
export const isEducator = (role: string | null | undefined): boolean =>
  userIsRole(role, ...(ROLE_GROUPS.EDUCATORS as RoleValue[]));
