/**
 * File Upload Integration
 *
 * Wraps the backend's generic /upload endpoint.  All file upload calls
 * (lesson documents, avatars, etc.) go through this integration.
 */

import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../../constants/api';
import { APP_CONFIG } from '../../app/config/appConfig';

export interface UploadResult {
  url: string;
  filename: string;
}

/**
 * Uploads a single file and returns its server-side URL.
 *
 * @param file     The File object selected by the user.
 * @param fieldName Optional form-field name (defaults to "file").
 */
export const uploadFile = async (
  file: File,
  fieldName = 'file',
): Promise<UploadResult> => {
  if (file.size > APP_CONFIG.MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(
      `File size exceeds the ${APP_CONFIG.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB limit.`,
    );
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await apiClient.post<UploadResult>(
    API_ENDPOINTS.UPLOAD,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data;
};

/**
 * Uploads an image file specifically (uses /upload/image endpoint).
 */
export const uploadImage = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post<UploadResult>(
    API_ENDPOINTS.UPLOAD_IMAGE,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data;
};
