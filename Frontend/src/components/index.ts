/**
 * Components barrel export.
 *
 * Prefer importing from the sub-folder barrel for tree-shaking:
 *   import { ConfirmModal } from '@/components/modals'
 *   import { Pagination, StatsCard } from '@/components/common'
 *   import { GradeLevelSelect } from '@/components/forms'
 *
 * Or import anything from this single entry-point:
 *   import { ConfirmModal, Pagination, StatsCard } from '@/components'
 */

export * from './common';
export * from './modals';
export * from './forms';
export * from './export';
export * from './reports';
export * from './support';
export * from './AIChat';
