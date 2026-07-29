/**
 * SchoolSelector
 *
 * A compact dropdown that lets SuperAdmin switch between an "All Schools"
 * platform-wide view and one specific school, or lets a Teacher switch
 * between the multiple schools they're assigned to (Requirement 2/3).
 * Hidden for Admin, Staff, Principal, Student, Parent.
 *
 * The "All Schools" (clear-to-null) option only renders for roles with
 * canClearSelection (SuperAdmin) — a Teacher must always have exactly one
 * school selected, so they only ever see their own assigned schools listed.
 *
 * The selected school ID is stored in SchoolSelectorContext → localStorage,
 * which both Axios instances (api.ts and apiClient.ts) pick up as the
 * X-School-Id request header.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useSchoolSelector } from '../contexts/SchoolSelectorContext';

interface Props {
  /** Passed down from Header so the component can adapt its colour in light/dark mode. */
  isDark?: boolean;
}

const SchoolSelector: React.FC<Props> = ({ isDark = false }) => {
  const {
    schools,
    selectedSchool,
    selectedSchoolId,
    setSelectedSchoolId,
    loading,
    canSelectSchool,
    canClearSelection,
  } = useSchoolSelector();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!canSelectSchool) return null;

  const label = selectedSchool?.name ?? (canClearSelection ? 'All Schools' : 'Select School');

  const base = isDark
    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${base}`}
        title="Switch school context"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <Building2 className="w-4 h-4 shrink-0" />
        )}
        <span className="max-w-[140px] truncate hidden sm:block">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-1 w-64 rounded-xl shadow-xl border z-50 py-1 max-h-72 overflow-y-auto
            ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          role="listbox"
        >
          {/* SuperAdmin can clear selection to see all data — Teacher never can (Requirement 3). */}
          {canClearSelection && (
            <>
              <button
                role="option"
                aria-selected={selectedSchoolId === null}
                onClick={() => { setSelectedSchoolId(null); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                  ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Building2 className="w-4 h-4 opacity-50 shrink-0" />
                <span className="flex-1 font-medium">All Schools</span>
                {selectedSchoolId === null && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
              </button>

              <div className={`mx-3 my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
            </>
          )}

          {schools.length === 0 && !loading && (
            <p className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No schools available
            </p>
          )}

          {schools.map((school) => (
            <button
              key={school.id}
              role="option"
              aria-selected={school.id === selectedSchoolId}
              onClick={() => { setSelectedSchoolId(school.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Building2 className="w-4 h-4 shrink-0 opacity-60" />
              <span className="flex-1 truncate">{school.name}</span>
              {school.id === selectedSchoolId && (
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolSelector;
