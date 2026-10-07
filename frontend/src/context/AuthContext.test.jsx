import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  apiFetch: vi.fn(),
  onUnauthorized: vi.fn(() => () => {}),
  refreshSession: vi.fn(),
  setAccessToken: vi.fn(),
}));

import * as api from '../lib/api.js';
import { AuthProvider, useAuth } from './AuthContext.jsx';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  api.refreshSession.mockResolvedValue({ user: { id: 'u1', name: 'Ada' } });
  api.onUnauthorized.mockReturnValue(() => {});
});

describe('AuthProvider', () => {
  it('restores a session from the refresh cookie on mount', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.user).toEqual({ id: 'u1', name: 'Ada' });
  });

  it('finishes ready with no user when the refresh fails', async () => {
    api.refreshSession.mockRejectedValue(new Error('no session'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.user).toBeNull();
  });

  it('logs in and stores the access token', async () => {
    api.apiFetch.mockResolvedValue({ accessToken: 'tok', user: { id: 'u2' } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    let returned;
    await act(async () => {
      returned = await result.current.login({ email: 'a@b.c', password: 'x' });
    });

    expect(returned).toEqual({ id: 'u2' });
    expect(api.setAccessToken).toHaveBeenCalledWith('tok');
    expect(result.current.user).toEqual({ id: 'u2' });
  });

  it('registers and stores the access token', async () => {
    api.apiFetch.mockResolvedValue({ accessToken: 'tok', user: { id: 'u3' } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.register({ email: 'a@b.c', password: 'x', name: 'A' });
    });

    expect(api.setAccessToken).toHaveBeenCalledWith('tok');
    expect(result.current.user).toEqual({ id: 'u3' });
  });

  it('logs out and clears the local session', async () => {
    api.apiFetch.mockResolvedValue({ });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(api.setAccessToken).toHaveBeenCalledWith(null);
    expect(result.current.user).toBeNull();
  });

  it('clears the session even when the logout request fails', async () => {
    api.apiFetch.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  });
});
