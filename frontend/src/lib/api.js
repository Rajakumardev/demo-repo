const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// The access token is intentionally kept in memory only: it is never persisted
// to storage, so it cannot be read by injected scripts. Session continuity is
// provided by the httpOnly refresh cookie.
let accessToken = null;
let refreshPromise = null;
const unauthorizedListeners = new Set();

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Subscribe to forced logouts triggered by an unrecoverable 401. */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function emitUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener());
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = data?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data?.error?.details);
  }

  return data;
}

/** Exchange the refresh cookie for a new access token (deduplicated). */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(parseResponse)
      .then((data) => {
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Fetch wrapper that attaches the access token and transparently retries once
 * after refreshing the session when the server responds with 401.
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, auth = true, retry = true, headers: extraHeaders } = options;

  const headers = { ...extraHeaders };
  const init = { method, credentials: 'include', headers };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, init);

  if (res.status === 401 && auth && retry) {
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      emitUnauthorized();
      throw await parseResponse(res);
    }
    return apiFetch(path, { ...options, retry: false });
  }

  return parseResponse(res);
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body }),
  del: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};

export { BASE_URL };
