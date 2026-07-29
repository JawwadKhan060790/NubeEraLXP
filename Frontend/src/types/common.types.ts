/**
 * Common shared types used across the entire application.
 */

/** Standard paginated API response wrapper. */
export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Standard API error response shape from the backend. */
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  status_code: number;
}

/** Generic select/dropdown option. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Confirmation modal state (used by useConfirm). */
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

/** Generic loading state. */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/** Sort direction. */
export type SortDirection = 'asc' | 'desc';

/** Common list query parameters. */
export interface ListQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: SortDirection;
}
