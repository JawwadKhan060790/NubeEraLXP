/**
 * usePagination hook
 *
 * Manages client-side pagination state.  Pass your full data array and
 * receive back the current page's items plus pagination controls.
 *
 * Usage:
 *   const { currentItems, ...paginationProps } = usePagination(items, 20);
 *   <DataTable rows={currentItems} />
 *   <Pagination {...paginationProps} />
 */

import { useState, useMemo } from 'react';
import { APP_CONFIG } from '../app/config/appConfig';

interface UsePaginationResult<T> {
  /** Items for the current page. */
  currentItems: T[];
  /** Current page number (1-indexed). */
  currentPage: number;
  /** Number of rows displayed per page. */
  pageSize: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of items in the source array. */
  totalItems: number;
  /** Navigate to a specific page. */
  onPageChange: (page: number) => void;
  /** Change the page size (resets to page 1). */
  onPageSizeChange: (size: number) => void;
  /** Reset to page 1 (e.g. after a search filter changes). */
  resetPage: () => void;
}

export const usePagination = <T>(
  items: T[],
  initialPageSize: number = APP_CONFIG.DEFAULT_PAGE_SIZE,
): UsePaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Guard: if filters reduce the data and the current page is out of range,
  // snap back to the last valid page.
  const safePage = Math.min(currentPage, totalPages);

  const currentItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const onPageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetPage = () => setCurrentPage(1);

  return {
    currentItems,
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    onPageChange,
    onPageSizeChange,
    resetPage,
  };
};
