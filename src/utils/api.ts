/**
 * Unified fetch wrapper — handles credentials, JSON parsing, 401 interception.
 *
 * Usage:
 *   const data = await apiGet<UserStats>('/api/auth/stats', { onUnauthorized });
 *   const data = await apiPost('/api/auth/login', { email, password }, { onUnauthorized });
 *
 * Throws ApiError on non-2xx responses (caller can catch & show toast).
 * Calls onUnauthorized callback when server returns 401 — caller decides
 * whether to logout / redirect / show login modal.
 */

import { getOrCreateDeviceId } from './deviceId';

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiOptions {
  /** Called when server returns 401 — typically triggers user logout + login modal. */
  onUnauthorized?: () => void;
  /** Extra headers (Content-Type is auto-set for JSON body). */
  headers?: Record<string, string>;
  /** AbortController signal for timeout/cancellation. */
  signal?: AbortSignal;
}

interface ApiResult<T> {
  data: T;
  response: Response;
}

async function apiFetch<T = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const deviceId = getOrCreateDeviceId();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...options.headers,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    // Network error / abort
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new ApiError('网络请求异常，请检查后端服务是否启动', 0, err);
  }

  // 401 — trigger caller's unauthorized handler, then throw ApiError
  if (response.status === 401) {
    options.onUnauthorized?.();
    let payload: unknown = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    const msg = (payload as { message?: string })?.message ?? '登录已失效，请重新登录';
    throw new ApiError(msg, 401, payload);
  }

  // Parse JSON (server always returns JSON, even on error)
  let payload: unknown = null;
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    try { payload = await response.json(); } catch { /* ignore */ }
  }

  if (!response.ok) {
    const msg = (payload as { message?: string })?.message ?? `请求失败 (${response.status})`;
    throw new ApiError(msg, response.status, payload);
  }

  return { data: payload as T, response };
}

export function apiGet<T = unknown>(url: string, options?: ApiOptions): Promise<ApiResult<T>> {
  return apiFetch<T>(url, 'GET', undefined, options);
}

export function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiOptions
): Promise<ApiResult<T>> {
  return apiFetch<T>(url, 'POST', body, options);
}

export function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiOptions
): Promise<ApiResult<T>> {
  return apiFetch<T>(url, 'PUT', body, options);
}

export function apiDelete<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiOptions
): Promise<ApiResult<T>> {
  return apiFetch<T>(url, 'DELETE', body, options);
}
