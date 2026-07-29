/**
 * Topic Service — master curriculum catalog, always a child of one Unit
 * (Requirement 1/6). Same authorization/visibility model as unitService.
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Topic,
  TopicCreatePayload,
  TopicUpdatePayload,
  TopicSummary,
  TopicQueryParams,
} from '../types/curriculum.types';

const getAll = (params?: TopicQueryParams): Promise<Topic[]> =>
  get<Topic[]>(API_ENDPOINTS.TOPICS.BASE, { params });

const getSummaries = (unitId?: string): Promise<TopicSummary[]> =>
  get<TopicSummary[]>(API_ENDPOINTS.TOPICS.SUMMARIES, { params: unitId ? { unitId } : undefined });

const getById = (id: string): Promise<Topic> =>
  get<Topic>(API_ENDPOINTS.TOPICS.BY_ID(id));

const create = (payload: TopicCreatePayload): Promise<{ id: string; message: string }> =>
  post<{ id: string; message: string }>(API_ENDPOINTS.TOPICS.BASE, payload);

const update = (id: string, payload: TopicUpdatePayload): Promise<void> =>
  put<void>(API_ENDPOINTS.TOPICS.BY_ID(id), payload);

const remove = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.TOPICS.DELETE(id));

export const topicService = {
  getAll,
  getSummaries,
  getById,
  create,
  update,
  remove,
};
