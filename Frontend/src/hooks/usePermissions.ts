/**
 * usePermissions hook
 *
 * Provides permission checks based on the current user's role.
 * Use this in components to guard actions and UI elements.
 *
 * Usage:
 *   const { can, isRole } = usePermissions();
 *   if (can(PERMISSIONS.STUDENTS_CREATE)) { ... }
 *   if (isRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)) { ... }
 */

import { useMemo } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { PERMISSION_MATRIX, type Permission } from '../constants/permissions';
import { ROLE_GROUPS, type RoleValue } from '../constants/roles';

interface UsePermissionsResult {
  /**
   * Returns true when the current user has the specified permission.
   * Always returns false when unauthenticated.
   */
  can: (permission: Permission) => boolean;

  /**
   * Returns true when the current user's utype is one of the given roles.
   */
  isRole: (...roles: RoleValue[]) => boolean;

  /** True when the user is an admin or super-admin. */
  isAdmin: boolean;
  /** True when the user is a principal. */
  isPrincipal: boolean;
  /** True when the user is a staff member. */
  isStaff: boolean;
  /** True when the user is a teacher. */
  isTeacher: boolean;
  /** True when the user is a student. */
  isStudent: boolean;
  /** True when the user is a parent. */
  isParent: boolean;
  /** True when the user has admin-level access (admin or superadmin). */
  isAdminLevel: boolean;
  /** True when the user has school-manager access. */
  isSchoolManager: boolean;
  /** True when the user has educator access. */
  isEducator: boolean;
}

export const usePermissions = (): UsePermissionsResult => {
  const { user } = useAuthContext();

  return useMemo<UsePermissionsResult>(() => {
    const role = user?.utype as RoleValue | undefined;

    const can = (permission: Permission): boolean => {
      if (!role) return false;
      return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
    };

    const isRole = (...roles: RoleValue[]): boolean =>
      role ? roles.includes(role) : false;

    return {
      can,
      isRole,
      isAdmin:        isRole('admin', 'superadmin'),
      isPrincipal:    isRole('principal'),
      isStaff:        isRole('staff'),
      isTeacher:      isRole('teacher'),
      isStudent:      isRole('student'),
      isParent:       isRole('parent'),
      isAdminLevel:   role ? ROLE_GROUPS.ADMIN_LEVEL.includes(role) : false,
      isSchoolManager:role ? ROLE_GROUPS.SCHOOL_MANAGERS.includes(role) : false,
      isEducator:     role ? ROLE_GROUPS.EDUCATORS.includes(role) : false,
    };
  }, [user]);
};
