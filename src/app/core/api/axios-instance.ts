import axios, { InternalAxiosRequestConfig } from 'axios';
import { environment } from '@env/environment';

export const axiosInstance = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function normalizeUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const [path, query] = url.split('?');
  const normalizedPath = path.endsWith('/') || path.includes('.') ? path : `${path}/`;
  return query !== undefined ? `${normalizedPath}?${query}` : normalizedPath;
}

axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Ensure Django-compatible trailing slashes on API endpoints
    if (config.url) {
      config.url = normalizeUrl(config.url);
    }

    // 2. Read token from local storage directly (avoids circular dependency)
    const storedToken = localStorage.getItem('eventhub_token');

    // 3. If token exists, attach Bearer Authorization header
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        config.headers['Authorization'] = `Bearer ${parsedToken}`;
      } catch (e) {
        config.headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig;

    // If no response or already retried or auth endpoints, do not retry
    if (
      !error.response ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/accounts/login') ||
      originalRequest.url?.includes('/accounts/token/refresh')
    ) {
      return Promise.reject(error);
    }

    // If 401 Unauthorized (e.g. token expired with "Given token not valid for any token type")
    if (error.response.status === 401) {
      const rawRefreshToken = localStorage.getItem('eventhub_refresh_token');
      let refreshToken: string | null = null;
      if (rawRefreshToken) {
        try {
          refreshToken = JSON.parse(rawRefreshToken);
        } catch {
          refreshToken = rawRefreshToken;
        }
      }

      // If no refresh token available, session is completely expired
      if (!refreshToken) {
        localStorage.removeItem('eventhub_token');
        localStorage.removeItem('eventhub_refresh_token');
        localStorage.removeItem('eventhub_user');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/login')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/accounts/token/refresh/`;

      return new Promise((resolve, reject) => {
        axios
          .post(refreshUrl, { refresh: refreshToken })
          .then(({ data }) => {
            const newAccessToken = data.access;
            localStorage.setItem('eventhub_token', JSON.stringify(newAccessToken));
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            resolve(axiosInstance(originalRequest));
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.removeItem('eventhub_token');
            localStorage.removeItem('eventhub_refresh_token');
            localStorage.removeItem('eventhub_user');
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/login')) {
              window.location.href = '/auth/login';
            }
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);
