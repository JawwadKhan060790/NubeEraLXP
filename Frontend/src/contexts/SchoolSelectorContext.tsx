/**
 * SchoolSelectorContext
 *
 * Provides a school selector for SuperAdmin and Teacher only.
 *
 * Role behaviour:
 *  - SuperAdmin : dropdown visible; data source = ALL schools; can clear to
 *                 null (= "All Schools"); no auto-select.
 *  - Teacher    : dropdown visible; data source = ONLY the Teacher's own
 *                 active TeacherSchools memberships (Requirement 3 — never
 *                 the global School list); auto-selects their primary school
 *                 (falling back to the first) on first load; can NEVER clear
 *                 to null — a Teacher always has exactly one selected School.
 *  - Admin/Staff: NO dropdown — they always see ALL schools' data
 *  - Principal/Student/Parent: NO dropdown — always scoped to their JWT school
 *
 * Selected school is persisted to localStorage so it survives page refreshes.
 * Both Axios instances (api.ts and apiClient.ts) read the same key to attach
 * the X-School-Id header that the backend's TenantMiddleware /
 * TeacherSchoolAccessMiddleware rely on to resolve and validate the effective
 * SchoolId for every request.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { schoolService } from '../services/schoolService';
import { teacherSchoolService } from '../services/teacherSchoolService';
import type { School } from '../types/school.types';
import { ROLES } from '../constants/roles';
import type { RoleValue } from '../constants/roles';

// SuperAdmin and Teacher both get the school selector dropdown — SuperAdmin
// to optionally scope the platform-wide view to one school, Teacher because
// Requirement 2/3 lets one Teacher belong to multiple Schools and they must
// be able to switch which School's data they're working in.
// Admin and Staff always see all-school data — no dropdown needed.
const SCHOOL_SELECTOR_ROLES: RoleValue[] = [
  ROLES.SUPER_ADMIN,
  ROLES.TEACHER,
];

const STORAGE_KEY = 'nubeera_selected_school_id';

interface SchoolSelectorContextValue {
  /** Schools available for selection. Empty for restricted roles. */
  schools: School[];
  /** Currently selected school ID, or null (= "All Schools" for SuperAdmin). */
  selectedSchoolId: string | null;
  /** Select a school by ID, or pass null to clear (SuperAdmin only — Teacher may not clear). */
  setSelectedSchoolId: (id: string | null) => void;
  /** True while fetching the schools list. */
  loading: boolean;
  /** True if the current user's role can select a school. */
  canSelectSchool: boolean;
  /** True only for roles allowed to clear the selection to "All Schools" (SuperAdmin). */
  canClearSelection: boolean;
  /** The full School object for the currently selected ID. */
  selectedSchool: School | null;
}

const SchoolSelectorContext = createContext<SchoolSelectorContextValue | undefined>(undefined);

interface SchoolSelectorProviderProps {
  children: ReactNode;
  userUtype: RoleValue | string | null;
}

export const SchoolSelectorProvider: React.FC<SchoolSelectorProviderProps> = ({
  children,
  userUtype,
}) => {
  const canSelectSchool  = SCHOOL_SELECTOR_ROLES.includes(userUtype as RoleValue);
  const isTeacher        = userUtype === ROLES.TEACHER;
  // Only SuperAdmin may clear to "All Schools" — a Teacher must always be
  // scoped to exactly one of their assigned Schools (Requirement 3).
  const canClearSelection = canSelectSchool && !isTeacher;

  const [schools, setSchools]               = useState<School[]>([]);
  const [loading, setLoading]               = useState(false);
  const [selectedSchoolId, _setSelected]    = useState<string | null>(
    () => (canSelectSchool ? localStorage.getItem(STORAGE_KEY) : null)
  );

  // Persist selection and keep localStorage in sync with the Axios interceptors
  const setSelectedSchoolId = useCallback((id: string | null) => {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== id) {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      _setSelected(id);
      window.location.reload();
    }
  }, []);

  // Fetch the selectable school list when the role can select a school.
  useEffect(() => {
    if (!canSelectSchool) {
      setSchools([]);
      _setSelected(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    setLoading(true);

    if (isTeacher) {
      // Teacher: pull ONLY this Teacher's own active TeacherSchools
      // memberships (Requirement 3 — never the global School list, which
      // would leak every other School's existence to them).
      teacherSchoolService
        .getMySchools()
        .then((rows) => {
          const list = rows.map<School>((r) => ({
            id: r.school_id,
            name: r.school_name,
            school_code: '',
            is_active: r.is_active,
          }));
          setSchools(list);

          // A Teacher may never end up with no selection, and must never stay
          // pinned to a School they were since unassigned from — re-resolve
          // on every load rather than only when nothing was stored yet.
          const stillValid = !!selectedSchoolId && rows.some((r) => r.school_id === selectedSchoolId);
          if (!stillValid && rows.length > 0) {
            const primary = rows.find((r) => r.is_primary) ?? rows[0];
            setSelectedSchoolId(primary.school_id);
          } else if (rows.length === 0) {
            setSelectedSchoolId(null);
          }
        })
        .catch(() => setSchools([]))
        .finally(() => setLoading(false));
      return;
    }

    // SuperAdmin: full platform-wide list; no auto-select — null means
    // "all schools" for them.
    schoolService
      .getSchools()
      .then((list) => setSchools(list))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelectSchool, isTeacher]);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) ?? null;

  return (
    <SchoolSelectorContext.Provider
      value={{
        schools,
        selectedSchoolId,
        setSelectedSchoolId,
        loading,
        canSelectSchool,
        canClearSelection,
        selectedSchool,
      }}
    >
      {children}
    </SchoolSelectorContext.Provider>
  );
};

export const useSchoolSelector = (): SchoolSelectorContextValue => {
  const ctx = useContext(SchoolSelectorContext);
  if (!ctx) throw new Error('useSchoolSelector must be used inside SchoolSelectorProvider');
  return ctx;
};
