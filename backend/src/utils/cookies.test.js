import test from 'node:test';
import assert from 'node:assert/strict';

import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from './cookies.js';

function fakeRes() {
  return {
    cookie: (...args) => {
      fakeRes.last = args;
    },
    clearCookie: (...args) => {
      fakeRes.last = args;
    },
  };
}

test('setRefreshCookie writes an httpOnly scoped cookie', () => {
  const res = fakeRes();
  const expires = new Date('2026-02-01T00:00:00Z');
  setRefreshCookie(res, 'token-value', expires);

  const [name, value, options] = fakeRes.last;
  assert.equal(name, REFRESH_COOKIE);
  assert.equal(value, 'token-value');
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/api/auth');
  assert.equal(options.expires, expires);
  // NODE_ENV=test, so cookies are not secure-only.
  assert.equal(options.secure, false);
});

test('clearRefreshCookie clears with the same base options', () => {
  const res = fakeRes();
  clearRefreshCookie(res);

  const [name, options] = fakeRes.last;
  assert.equal(name, REFRESH_COOKIE);
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, '/api/auth');
});
