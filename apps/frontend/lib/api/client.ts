import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Skip the hard redirect to /login when a 401 cannot be refreshed. Set on
     * the session-bootstrap request, where a 401 just means "not signed in".
     */
    skipAuthRedirect?: boolean;
  }
}

// Dev auth secret - must match DEV_AUTH_SECRET in backend .env
// SECURITY: Only set this in development, never in production
const DEV_AUTH_SECRET = process.env.NEXT_PUBLIC_DEV_AUTH_SECRET;

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Hard timeout — without this, an interceptor that never resolves (e.g. a
  // hung refresh) leaves the original request stuck indefinitely.
  timeout: 30000,
});

// The access token is held in memory, not in a JS-readable cookie.
//
// The API issues `access_token` as an HttpOnly cookie, and a browser silently
// discards any document.cookie write to a name already held by an HttpOnly
// cookie — so the old `Cookies.set('access_token', …)` never stored anything and
// `Cookies.get` always came back undefined. The HttpOnly cookie is the real
// credential and rides along on every request via `withCredentials`; this copy
// only populates the Authorization header for deployments where the frontend and
// API are on different sites and the cookie cannot travel.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// In-flight GET deduplication: if the same URL+params is requested while a
// previous identical request is still in flight, share the same promise so
// the API isn't hit multiple times. Concurrent components mounting in StrictMode
// or in quick succession used to trigger 60+ duplicate lookup calls per session.
const inflightGets = new Map<string, Promise<any>>();
const inflightKey = (url: string, params: any) =>
  `${url}|${params ? JSON.stringify(params) : ''}`;

const originalGet = api.get.bind(api);
api.get = ((url: string, config?: any): any => {
  const key = inflightKey(url, config?.params);
  const existing = inflightGets.get(key);
  if (existing) return existing;
  const promise = originalGet(url, config).finally(() => {
    inflightGets.delete(key);
  });
  inflightGets.set(key, promise);
  return promise;
}) as typeof api.get;

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // In dev mode with secret configured, add bypass header
    // SECURITY: This will only work if backend has matching DEV_AUTH_SECRET
    if (DEV_AUTH_SECRET) {
      config.headers['X-Dev-Auth'] = DEV_AUTH_SECRET;
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Single-flight token refresh — concurrent 401s share one in-flight refresh
// promise instead of triggering N parallel refresh requests (which were
// causing thundering-herd 500s + hung requests).
let refreshPromise: Promise<string> | null = null;

const performRefresh = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, timeout: 15000 })
    .then((response) => {
      const refreshed = response.data?.accessToken as string;
      if (!refreshed) throw new Error('No accessToken in refresh response');
      // The API also re-issues the HttpOnly cookie on this response; this keeps
      // the in-memory copy in step for the Authorization header.
      setAccessToken(refreshed);
      return refreshed;
    })
    .finally(() => {
      // Reset so the next 401 (after this one settles) can trigger a fresh refresh
      refreshPromise = null;
    });
  return refreshPromise;
};

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshed = await performRefresh();
        // Retry original request with the fresh token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshed}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (or timed out) — drop the session. The HttpOnly cookies
        // are the API's to clear; all we can drop is the in-memory copy.
        setAccessToken(null);
        // `skipAuthRedirect` is set by the session-bootstrap call on page load:
        // a signed-out visitor legitimately fails that one, and redirecting
        // would bounce /login back to itself forever.
        const onLoginPage =
          typeof window !== 'undefined' && window.location.pathname === '/login';
        if (
          !DEV_AUTH_SECRET &&
          !originalRequest.skipAuthRedirect &&
          !onLoginPage &&
          typeof window !== 'undefined'
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
