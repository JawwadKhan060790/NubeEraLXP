import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  if (envUrl) {
    if (envUrl === '/api') return '/api';
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  const host = window.location.hostname;

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }

  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;

    // Forward the school selected in the UI so the backend TenantService can use it.
    // Restricted roles (Principal/Student/Parent) never set this key, so the header
    // is only sent when a non-restricted role has picked a school.
    const selectedSchoolId = localStorage.getItem('nubeera_selected_school_id');
    if (selectedSchoolId) {
      config.headers['X-School-Id'] = selectedSchoolId;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Unwrap ApiResponse envelope: { success, message, data, status_code, errors }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    // Promote the inner data.message to top level so callers can read err.response.data.message
    if (error.response?.data && typeof error.response.data === 'object') {
      const inner = error.response.data.data;
      if (inner?.message) {
        error.response.data.message = inner.message;
      }
    }

    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem('token');
      const reqUrl = error.config?.url || '';

      // Only redirect to login if there is no token or if the 401 comes from explicit auth validation
      if (currentPath !== '/login' && (!token || reqUrl.includes('/auth/me') || reqUrl.includes('/auth/refresh') || reqUrl.includes('/auth/validate'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('nubeera_selected_school_id');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
