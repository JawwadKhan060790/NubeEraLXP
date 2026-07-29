import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalItems === 0) return null;

  const pageSizes = [10, 20, 30, 50, 100];

  // Calculate range of data currently shown
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 px-5 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-[#283548]">
      {/* Left: Row selector and counts */}
     

      {/* Right: Modern Paginated Controls */}
      <div className="flex items-center gap-1.5">
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-[#334155]/60 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1e293b] disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-xs cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-[#334155]/60 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1e293b] disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-xs cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers list */}
        <div className="flex items-center gap-1 mx-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(pageNum => {
              if (totalPages <= 7) return true;
              if (pageNum === 1 || pageNum === totalPages) return true;
              return Math.abs(pageNum - currentPage) <= 1;
            })
            .map((pageNum, idx, arr) => {
              const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
              return (
                <React.Fragment key={pageNum}>
                  {showEllipsis && (
                    <span className="text-slate-400 dark:text-[#475569] font-bold px-1 select-none text-xs">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-extrabold transition-all cursor-pointer ${currentPage === pageNum
                      ? 'bg-primary text-white shadow-sm shadow-primary/20 scale-[1.03]'
                      : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#283548] border border-transparent hover:border-slate-200 dark:hover:border-[#334155]'
                      }`}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              );
            })
          }
        </div>

        {/* Next page button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-[#334155]/60 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1e293b] disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-xs cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-[#334155]/60 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1e293b] disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-xs cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

       <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-500 dark:text-[#94a3b8] font-semibold uppercase tracking-wider">Rows per page:</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-700 dark:text-[#e2e8f0] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer appearance-none shadow-xs min-w-[70px]"
          >
            {pageSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-[#64748b]">
            <ChevronRight className="w-3.5 h-3.5 rotate-90" />
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-[#94a3b8] font-medium ml-2">
          Showing <span className="font-semibold text-slate-800 dark:text-[#f1f5f9]">{startItem}</span> to <span className="font-semibold text-slate-800 dark:text-[#f1f5f9]">{endItem}</span> of <span className="font-bold text-primary">{totalItems}</span> entries
        </span>
      </div>

    </div>
  );
};

export default Pagination;
