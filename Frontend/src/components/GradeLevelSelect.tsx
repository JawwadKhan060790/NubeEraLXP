import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';

export interface GradeLevelOption {
  id: string;
  levelNumber: number;
  name: string;
  displayOrder: number;
}

// Module-level cache so every instance of the selector on a page shares one
// network round trip — the standardized 1st-10th list rarely changes, and the
// backend already caches it (GradeAccessService / SchoolGradeRangeService).
// This is the single, centrally-governed source every dropdown must read from;
// no component should hardcode a grade list (e.g. `[...Array(12)]`).
let masterCache: GradeLevelOption[] | null = null;
let masterPromise: Promise<GradeLevelOption[]> | null = null;
const allowedCache = new Map<string, GradeLevelOption[]>();
const allowedPromises = new Map<string, Promise<GradeLevelOption[]>>();

const normalize = (rows: any[]): GradeLevelOption[] =>
  (rows || []).map((g: any) => ({
    id: g.id ?? g.Id,
    levelNumber: g.level_number ?? g.levelNumber ?? g.LevelNumber,
    name: g.name ?? g.Name,
    displayOrder: g.display_order ?? g.displayOrder ?? g.DisplayOrder,
  })).sort((a, b) => a.displayOrder - b.displayOrder || a.levelNumber - b.levelNumber);

/**
 * Fetches the grade levels visible to the CURRENT authenticated user — i.e. the
 * standardized 1st-10th list filtered down to their school's configured
 * From Grade-To Grade range. This is the canonical "what grades can this user see"
 * call and should back every dropdown/filter/search/report in the app.
 */
export async function fetchAllowedGradeLevels(): Promise<GradeLevelOption[]> {
  const cacheKey = 'current-user';
  if (allowedCache.has(cacheKey)) return allowedCache.get(cacheKey)!;
  if (!allowedPromises.has(cacheKey)) {
    allowedPromises.set(cacheKey, api.get('/grade-levels').then(res => {
      const list = normalize(res.data);
      allowedCache.set(cacheKey, list);
      return list;
    }).catch(err => {
      allowedPromises.delete(cacheKey);
      throw err;
    }));
  }
  return allowedPromises.get(cacheKey)!;
}

/**
 * Fetches the FULL standardized 1st-10th Grade master list, unfiltered. Used only
 * by platform-level Academic Setup screens (e.g. School create/edit From Grade /
 * To Grade pickers) where the complete master must be presented regardless of any
 * individual school's currently configured range. Requires PrincipalOnly+ access.
 */
export async function fetchMasterGradeLevels(): Promise<GradeLevelOption[]> {
  if (masterCache) return masterCache;
  if (!masterPromise) {
    masterPromise = api.get('/grade-levels/master').then(res => {
      masterCache = normalize(res.data);
      return masterCache;
    }).catch(err => {
      masterPromise = null;
      throw err;
    });
  }
  return masterPromise;
}
/**
 * Fetches the grades allowed for a SPECIFIC school.
 */
export async function fetchSchoolGradeLevels(schoolId: string): Promise<GradeLevelOption[]> {
  if (allowedCache.has(schoolId)) return allowedCache.get(schoolId)!;
  if (!allowedPromises.has(schoolId)) {
    allowedPromises.set(schoolId, api.get(`/grade-levels/by-school/${schoolId}`).then(res => {
      const list = normalize(res.data);
      allowedCache.set(schoolId, list);
      return list;
    }).catch(err => {
      allowedPromises.delete(schoolId);
      throw err;
    }));
  }
  return allowedPromises.get(schoolId)!;
}

/** Clears the in-memory caches — call after a school's grade range is edited. */
export function invalidateGradeLevelCaches() {
  masterCache = null;
  masterPromise = null;
  allowedCache.clear();
  allowedPromises.clear();
}

interface GradeLevelSelectProps {
  value: string;
  onChange: (levelNumber: string, option?: GradeLevelOption) => void;
  /**
   * 'allowed' (default): grades visible to the current user — their school's
   *   configured From Grade-To Grade range. Use this everywhere a normal user
   *   picks/filters by grade (registration, attendance, exams, timetable, etc.)
   * 'master': the full standardized 1st-10th list — ONLY for platform-level
   *   Academic Setup screens (e.g. the School From Grade/To Grade pickers).
   */
  source?: 'allowed' | 'master';
  schoolId?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Emits the option's LevelNumber (e.g. "1".."10") as the value — matches Grade.GradeLevel convention. */
  valueAs?: 'levelNumber' | 'id';
}

/**
 * Centralized, reusable Grade selector. Sources its options from the
 * `/api/grade-levels` family of endpoints — the single source of truth for
 * grade visibility — instead of any hardcoded range. Drop this in anywhere a
 * grade dropdown/filter is needed (forms, search panels, report filters, etc.)
 * to guarantee the standardized 1st-10th list and per-school visibility rules
 * are honored consistently across the entire application.
 */
const GradeLevelSelect: React.FC<GradeLevelSelectProps> = ({
  value,
  onChange,
  source = 'allowed',
  schoolId,
  required = false,
  disabled = false,
  placeholder = 'Choose Grade',
  className = 'w-full px-4 pr-10 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-gray-900 dark:text-[#e2e8f0] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none',
  valueAs = 'levelNumber',
}) => {
  const [options, setOptions] = useState<GradeLevelOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loader = schoolId
      ? fetchSchoolGradeLevels(schoolId)
      : source === 'master'
      ? fetchMasterGradeLevels()
      : fetchAllowedGradeLevels();
    loader
      .then(list => { if (!cancelled) setOptions(list); })
      .catch(err => console.error('Failed to load grade levels', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, schoolId]);
  return (
    <div className="relative">
      <select
        required={required}
        disabled={disabled || loading}
        value={value}
        onChange={e => {
          const selected = options.find(o => String(valueAs === 'id' ? o.id : o.levelNumber) === e.target.value);
          onChange(e.target.value, selected);
        }}
        className={className}
      >
        <option value="">{loading ? 'Loading grades...' : placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={String(valueAs === 'id' ? o.id : o.levelNumber)}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
    </div>
  );
};

export default GradeLevelSelect;
