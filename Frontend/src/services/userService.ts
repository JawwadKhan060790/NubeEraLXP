/**
 * User Service
 *
 * API calls for user management (admin-level user listing, profile updates).
 */

import { get, post, put, del } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import type { User } from '../types/auth.types';

export interface UserListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  school_id?: string;
  school_name?: string;
  created_at?: string;
}

/** Fetches all users (admin view). */
const getUsers = (): Promise<UserListItem[]> =>
  get<UserListItem[]>(API_ENDPOINTS.USERS.BASE);

/** Fetches a single user by ID. */
const getUser = (id: string): Promise<User> =>
  get<User>(API_ENDPOINTS.USERS.BY_ID(id));

/** Toggles the active status of a user. */
const toggleUserStatus = (id: string, is_active: boolean): Promise<{ message: string }> =>
  put(API_ENDPOINTS.USERS.BY_ID(id), { is_active });

/** Deletes a user account. */
const deleteUser = (id: string): Promise<void> =>
  del<void>(API_ENDPOINTS.USERS.BY_ID(id));

/** Creates a new user (admin action). */
const createUser = (payload: Partial<User> & { password: string }): Promise<User> =>
  post<User>(API_ENDPOINTS.USERS.BASE, payload);

/** Updates the authenticated user's own profile. */
const updateProfile = (payload: Partial<User>): Promise<User> =>
  put<User>(API_ENDPOINTS.USERS.UPDATE_PROFILE, payload);

/** Uploads a new profile avatar and returns the URL. */
const uploadAvatar = (formData: FormData): Promise<{ url: string }> =>
  post<{ url: string }>(API_ENDPOINTS.USERS.UPLOAD_AVATAR, formData);

export const userService = {
  getUsers,
  getUser,
  toggleUserStatus,
  deleteUser,
  createUser,
  updateProfile,
  uploadAvatar,
};
