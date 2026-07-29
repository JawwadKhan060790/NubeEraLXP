/**
 * Unit Service — master curriculum catalog (Requirement 1/6).
 *
 * Units are created/edited/deleted by Admin/Staff only. Reads rely on the
 * backend's EF Core global query filters: Admin/Staff/SuperAdmin see the
 * full master catalog; Teacher/Student/Principal only see active Units
 * assigned to their effective school — no school-scoping logic is needed
 * (or allowed) on this client.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Unit,
  UnitCreatePayload,
  UnitUpdatePayload,
  UnitSummary,
  UnitQueryParams,
} from '../types/curriculum.types';

const getAll = (params?: UnitQueryParams): Promise<Unit[]> =>
  get<Unit[]>(API_ENDPOINTS.UNITS.BASE, { params });

const getSummaries = (): Promise<UnitSummary[]> =>
  get<UnitSummary[]>(API_ENDPOINTS.UNITS.SUMMARIES);

const getById = (id: string): Promise<Unit> =>
  get<Unit>(API_ENDPOINTS.UNITS.BY_ID(id));

const create = (payload: UnitCreatePayload): Promise<{ id: string; message: string }> =>
  post<{ id: string; message: string }>(API_ENDPOINTS.UNITS.BASE, payload);

const update = (id: string, payload: UnitUpdatePayload): Promise<void> =>
  put<void>(API_ENDPOINTS.UNITS.BY_ID(id), payload);

const remove = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.UNITS.DELETE(id));

export const unitService = {
  getAll,
  getSummaries,
  getById,
  create,
  update,
  remove,
};
