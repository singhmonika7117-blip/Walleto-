import axios from 'axios';

// Base URL: prefers VITE_API_BASE_URL, targets http://localhost:5000/api directly in dev, or falls back to /api
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.hostname === 'localhost')
    ? 'http://localhost:5001/api'
    : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach JWT token from localStorage as Authorization header fallback
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401s for expired session while preserving auth page errors
api.interceptors.response.use(
  (response) => {
    const isAuthRequest = /\/auth\/(login|register|forgot-password|reset-password)/.test(response.config?.url || '');
    const contentType = response.headers?.['content-type'] || '';
    if (isAuthRequest && !contentType.includes('application/json')) {
      return Promise.reject(Object.assign(
        new Error('Walleto’s API is not connected. The backend deployment or VITE_API_BASE_URL needs attention.'),
        { code: 'ERR_API_UNAVAILABLE' }
      ));
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only redirect if NOT on the login/signup auth page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
