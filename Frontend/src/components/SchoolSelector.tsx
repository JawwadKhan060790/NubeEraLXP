/**
 * SchoolSelector
 *
 * A compact dropdown that lets SuperAdmin switch between an "All Schools"
 * platform-wide view and one specific school, or lets a Teacher switch
 * between the multiple schools they're assigned to.
 * Hidden for Admin, Staff, Principal, Student, Parent.
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs outline-none ${
          isDark
            ? 'bg-[#1e293b] hover:bg-[#283548] text-slate-200 border-[#334155] focus:ring-2 focus:ring-indigo-500/30'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20'
        }`}
        title="Switch school context"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
        }`}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="flex flex-col text-left leading-tight hidden sm:flex">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b]">
            School
          </span>
          <span className="max-w-[150px] truncate font-bold text-slate-800 dark:text-slate-100">
            {label}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-xl border z-50 p-1.5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#1e293b] border-[#334155] text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'
              : 'bg-white border-slate-200 text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.1)]'
          }`}
          role="listbox"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-[#283548] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] block">
              Select Active School
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Switch institution scope for classes & reports
            </span>
          </div>

          {/* SuperAdmin clear option */}
          {canClearSelection && (
            <>
              <button
                type="button"
                role="option"
                aria-selected={selectedSchoolId === null}
                onClick={() => { setSelectedSchoolId(null); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                  selectedSchoolId === null
                    ? isDark
                      ? 'bg-indigo-500/15 text-indigo-300 font-bold'
                      : 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-100'
                    : isDark
                    ? 'hover:bg-[#283548] text-slate-300'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  selectedSchoolId === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-[#283548] text-slate-500'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 font-bold">All Schools</span>
                {selectedSchoolId === null && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>

              <div className="mx-2 my-1 border-t border-slate-100 dark:border-[#283548]" />
            </>
          )}

          {schools.length === 0 && !loading && (
            <p className="px-3 py-3 text-xs text-slate-400 dark:text-[#64748b] text-center font-medium">
              No schools assigned
            </p>
          )}

          <div className="space-y-0.5">
            {schools.map((school) => {
              const isSelected = school.id === selectedSchoolId;
              return (
                <button
                  key={school.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { setSelectedSchoolId(school.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-indigo-500/15 text-indigo-300 font-bold'
                        : 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-100'
                      : isDark
                      ? 'hover:bg-[#283548] text-slate-300'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-[#283548] text-slate-500 dark:text-slate-400'
                  }`}>
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1 truncate font-bold">{school.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSelector;
