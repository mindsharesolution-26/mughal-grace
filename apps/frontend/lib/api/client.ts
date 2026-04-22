import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Dev auth secret - must match DEV_AUTH_SECRET in backend .env
// SECURITY: Only set this in development, never in production
const DEV_AUTH_SECRET = process.env.NEXT_PUBLIC_DEV_AUTH_SECRET;

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // In dev mode with secret configured, add bypass header
    // SECURITY: This will only work if backend has matching DEV_AUTH_SECRET
    if (DEV_AUTH_SECRET) {
      config.headers['X-Dev-Auth'] = DEV_AUTH_SECRET;
    }

    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;

        const isProduction = process.env.NODE_ENV === 'production';
        Cookies.set('access_token', accessToken, {
          expires: 1 / 96, // 15 minutes
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax',
        });

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');

        // Only redirect to login if not in dev mode
        if (!DEV_AUTH_SECRET && typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
