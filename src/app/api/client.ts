import { getSessionToken } from '../utils/session';

const CUSTOM_API_URL_KEY = 'customApiBaseUrl';
const REQUEST_TIMEOUT_MS = 8000;
const isCapacitorRuntime = typeof window !== 'undefined' && Boolean((window as any).Capacitor);

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getDefaultBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_URL || '';
  if (envBase) {
    return normalizeApiBaseUrl(envBase);
  }
  return isCapacitorRuntime ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';
}

export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(message: string, isNetworkError = false, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.isNetworkError = isNetworkError;
    this.status = status;
  }
}

export function getStoredApiBaseUrl(): string {
  const raw = localStorage.getItem(CUSTOM_API_URL_KEY) || '';
  return normalizeApiBaseUrl(raw);
}

export function setStoredApiBaseUrl(url: string): void {
  const normalized = normalizeApiBaseUrl(url);
  if (!normalized) {
    localStorage.removeItem(CUSTOM_API_URL_KEY);
    return;
  }
  localStorage.setItem(CUSTOM_API_URL_KEY, normalized);
}

function getActiveApiBaseUrl(): string {
  return getStoredApiBaseUrl() || getDefaultBaseUrl();
}

export async function checkApiHealth(candidate?: string): Promise<boolean> {
  const baseUrl = normalizeApiBaseUrl(candidate || getActiveApiBaseUrl());
  if (!baseUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const API_BASE_URL = getActiveApiBaseUrl();
  const token = getSessionToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiError(message, true);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.error || 'Request failed', false, response.status);
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl(): string {
  return getActiveApiBaseUrl();
}
