import axios from 'axios';

// All requests go through the Next.js rewrite proxy (/api → backend).
// This keeps the httpOnly refresh cookie first-party to the Vercel domain,
// which is the key requirement for cross-reload session persistence.
// NEVER use a direct backend URL here — it will break cookie auth.
const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Needed to send the httpOnly refresh cookie
});

// Access token lives in memory only (module scope) — never persisted to
// localStorage. This keeps it safe from XSS attacks. On page reload the token
// is gone, but a fresh one is obtained via /auth/refresh (httpOnly cookie).
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

// ── Single-flight refresh mechanism ──────────────────────────────────────────
// Guarantees at most ONE /auth/refresh request is in-flight at any time.
// Both the initial session restore (useAuth) and the 401 response interceptor
// share this promise, preventing concurrent refreshes that would trigger the
// backend's token-reuse detection and revoke the entire session.
let refreshPromise: Promise<string> | null = null;

const doRefresh = (): Promise<string> => {
  // If a refresh is already in-flight, return the same promise.
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const token = res.data.accessToken;
      setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// Public alias used by useAuth on mount.
export const refreshAccessToken = doRefresh;

// ── Interceptors ─────────────────────────────────────────────────────────────

// Request interceptor: attach access token to every outgoing request.
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: on 401, attempt a single-flight refresh and retry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await doRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
