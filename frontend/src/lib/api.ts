import axios, { AxiosError } from 'axios';

// Same-origin in production (Spring serves the app); the Vite dev server proxies /api to :8080.
const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') || '/api';

const TOKEN_KEY = 'financeiro.token';

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable — session stays in memory only */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Set when a request fails auth, so the app can drop back to the login screen. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // 403 here means the token is missing/expired (backend returns 403 for no token).
      const hadToken = Boolean(tokenStore.get());
      if (hadToken) {
        tokenStore.clear();
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

/** Pull a human message out of the backend's `{ error }` / `{ message }` / validation payloads. */
export function apiError(error: unknown, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Sem conexão com o servidor. Verifique se o backend está no ar.';
    }
    const data = error.response?.data as
      | { error?: string; message?: string; errors?: Record<string, string> }
      | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first) return first;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
