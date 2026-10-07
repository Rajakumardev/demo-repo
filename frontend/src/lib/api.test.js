import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let api;

function fakeResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  api = await import('./api.js');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('access token handling', () => {
  it('stores and returns the token in memory', () => {
    expect(api.getAccessToken()).toBeNull();
    api.setAccessToken('abc');
    expect(api.getAccessToken()).toBe('abc');
  });

  it('registers and removes unauthorized listeners', () => {
    const listener = vi.fn();
    const unsubscribe = api.onUnauthorized(listener);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('apiFetch', () => {
  it('returns parsed JSON and attaches the access token', async () => {
    api.setAccessToken('tok');
    fetch.mockResolvedValue(fakeResponse('{"ok":true}'));

    const data = await api.apiFetch('/things');

    expect(data).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      '/api/things',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  it('serialises a request body', async () => {
    fetch.mockResolvedValue(fakeResponse('{"ok":true}'));

    await api.apiFetch('/things', { method: 'POST', body: { name: 'x' } });

    const [, init] = fetch.mock.calls[0];
    expect(init.body).toBe('{"name":"x"}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('handles an empty response body', async () => {
    fetch.mockResolvedValue(fakeResponse(''));
    expect(await api.apiFetch('/things')).toBeNull();
  });

  it('turns a non-JSON error body into an ApiError', async () => {
    fetch.mockResolvedValue(fakeResponse('boom', 500));
    await expect(api.apiFetch('/things')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Request failed with status 500',
    });
  });

  it('surfaces the API error message and details', async () => {
    fetch.mockResolvedValue(
      fakeResponse('{"error":{"message":"bad","details":{"f":["x"]}}}', 400),
    );

    await expect(api.apiFetch('/things')).rejects.toMatchObject({
      status: 400,
      message: 'bad',
      details: { f: ['x'] },
    });
  });

  it('refreshes the session and retries once on 401', async () => {
    api.setAccessToken('stale');
    fetch
      .mockResolvedValueOnce(fakeResponse('{"error":{"message":"unauth"}}', 401))
      .mockResolvedValueOnce(fakeResponse('{"accessToken":"fresh","user":{}}'))
      .mockResolvedValueOnce(fakeResponse('{"ok":1}'));

    const data = await api.apiFetch('/things');

    expect(data).toEqual({ ok: 1 });
    expect(api.getAccessToken()).toBe('fresh');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('emits an unauthorized event and clears the token when refresh fails', async () => {
    api.setAccessToken('stale');
    const listener = vi.fn();
    api.onUnauthorized(listener);

    fetch
      .mockResolvedValueOnce(fakeResponse('{"error":{"message":"unauth"}}', 401))
      .mockResolvedValueOnce(fakeResponse('{"error":{"message":"expired"}}', 401));

    await expect(api.apiFetch('/things')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(api.getAccessToken()).toBeNull();
  });

  it('skips the retry when retry is disabled', async () => {
    api.setAccessToken('tok');
    fetch.mockResolvedValue(fakeResponse('{"error":{"message":"unauth"}}', 401));

    await expect(api.apiFetch('/things', { retry: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('refreshSession', () => {
  it('deduplicates concurrent refreshes', async () => {
    fetch.mockResolvedValue(fakeResponse('{"accessToken":"t"}'));

    const [a, b] = await Promise.all([api.refreshSession(), api.refreshSession()]);

    expect(a).toEqual({ accessToken: 't' });
    expect(b).toEqual(a);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('api helpers', () => {
  it('expose get, post, put and delete', async () => {
    fetch.mockResolvedValue(fakeResponse('{"ok":true}'));

    await api.api.get('/a');
    await api.api.post('/b', { x: 1 });
    await api.api.put('/c', { x: 2 });
    await api.api.del('/d');

    expect(fetch.mock.calls.map((c) => c[1].method)).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
  });
});

it('exports the base URL', () => {
  expect(api.BASE_URL).toBe('/api');
});
