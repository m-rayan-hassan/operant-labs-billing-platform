import axios from 'axios';

// The backend is running on port 5000, as configured in previous backend context.
// Default to localhost:5000 if no env var is set.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Needed to send the httpOnly refresh cookie
});

// Interceptor to attach the access token to requests (if stored in memory/localStorage)
// Wait, we'll store the access token in memory or localStorage.
// Let's assume we store it in localStorage for now, since it's a SPA-like app on Next.js client side.
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void, reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor to handle 401 Unauthorized errors and attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and it's not a retry already
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Attempt to refresh the token
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true // send refresh cookie
        });
        const newAccessToken = refreshResponse.data.accessToken;
        
        // Save the new token
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newAccessToken);
        }
        
        processQueue(null, newAccessToken);
        
        // Update header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, we log out the user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          // Optionally redirect to login page here, or handle in auth context
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
