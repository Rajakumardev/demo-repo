import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '../utils/errors.js';

const userModel = {
  findByEmail: mock.fn(async () => null),
  findByEmailWithHash: mock.fn(async () => null),
  findById: mock.fn(async () => null),
  create: mock.fn(async () => ({
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada',
    currency: 'USD',
    created_at: 'created',
    updated_at: 'updated',
  })),
};
mock.module('../models/user.model.js', { namedExports: userModel });

const categoryModel = {
  DEFAULT_CATEGORIES: [{ name: 'Food' }],
  createMany: mock.fn(async () => []),
};
mock.module('../models/category.model.js', { namedExports: categoryModel });

const refreshTokenModel = {
  store: mock.fn(async () => {}),
  findByHash: mock.fn(async () => null),
  revokeById: mock.fn(async () => {}),
  revokeByHash: mock.fn(async () => {}),
  revokeAllForUser: mock.fn(async () => {}),
};
mock.module('../models/refreshToken.model.js', { namedExports: refreshTokenModel });

const withTransaction = mock.fn(async (fn) => fn({ query: async () => ({}) }));
mock.module('../db/pool.js', { namedExports: { withTransaction } });

mock.module('../utils/password.js', {
  namedExports: {
    hashPassword: mock.fn(async () => 'hashed'),
    verifyPassword: mock.fn(async (plain) => plain === 'good'),
  },
});

mock.module('../utils/tokens.js', {
  namedExports: {
    signAccessToken: mock.fn(() => 'access-token'),
    signRefreshToken: mock.fn(() => ({ token: 'refresh-token', jti: 'jti-1' })),
    verifyRefreshToken: mock.fn((token) => {
      if (token !== 'refresh-token') throw new Error('bad token');
      return { sub: 'u1', jti: 'jti-1', type: 'refresh' };
    }),
    hashToken: mock.fn((token) => `hash(${token})`),
    expiryFromToken: mock.fn(() => new Date('2026-02-01')),
  },
});

const setRefreshCookie = mock.fn();
const clearRefreshCookie = mock.fn();
mock.module('../utils/cookies.js', {
  namedExports: { REFRESH_COOKIE: 'refresh_token', setRefreshCookie, clearRefreshCookie },
});

const auth = await import('./auth.controller.js');

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function invoke(handler, req, res) {
  let nextErr;
  await handler(req, res, (err) => {
    nextErr = err;
  });
  return nextErr;
}

test.beforeEach(() => {
  for (const fn of Object.values(userModel)) fn.mock?.resetCalls?.();
  for (const fn of Object.values(refreshTokenModel)) fn.mock?.resetCalls?.();
  categoryModel.createMany.mock.resetCalls();
  withTransaction.mock.resetCalls();
  setRefreshCookie.mock.resetCalls();
  clearRefreshCookie.mock.resetCalls();

  userModel.findByEmail.mock.mockImplementation(async () => null);
  userModel.findByEmailWithHash.mock.mockImplementation(async () => null);
  userModel.findById.mock.mockImplementation(async () => null);
  userModel.create.mock.mockImplementation(async () => ({
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada',
    currency: 'USD',
    created_at: 'created',
    updated_at: 'updated',
  }));
  refreshTokenModel.findByHash.mock.mockImplementation(async () => null);
  withTransaction.mock.mockImplementation(async (fn) => fn({ query: async () => ({}) }));
});

test('register creates a user, seeds categories and starts a session', async () => {
  const res = fakeRes();
  const req = { body: { name: 'Ada', email: 'ada@example.com', password: 'good' } };
  const err = await invoke(auth.register, req, res);

  assert.equal(err, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.accessToken, 'access-token');
  assert.deepEqual(res.body.user, {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada',
    currency: 'USD',
    createdAt: 'created',
    updatedAt: 'updated',
  });
  assert.equal(categoryModel.createMany.mock.callCount(), 1);
  assert.equal(refreshTokenModel.store.mock.callCount(), 1);
  assert.equal(setRefreshCookie.mock.callCount(), 1);
});

test('register rejects an existing email', async () => {
  userModel.findByEmail.mock.mockImplementation(async () => ({ id: 'u1' }));
  const err = await invoke(auth.register, { body: {} }, fakeRes());
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 409);
});

test('register maps a unique-violation race onto a conflict', async () => {
  withTransaction.mock.mockImplementation(async () => {
    throw Object.assign(new Error('duplicate'), { code: '23505' });
  });
  const err = await invoke(auth.register, { body: {} }, fakeRes());
  assert.equal(err.status, 409);
});

test('register surfaces unexpected transaction errors', async () => {
  withTransaction.mock.mockImplementation(async () => {
    throw new Error('db down');
  });
  const err = await invoke(auth.register, { body: {} }, fakeRes());
  assert.equal(err.message, 'db down');
});

test('login issues a session for valid credentials', async () => {
  userModel.findByEmailWithHash.mock.mockImplementation(async () => ({
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada',
    currency: 'USD',
    password_hash: 'hashed',
  }));
  const res = fakeRes();
  const err = await invoke(auth.login, { body: { email: 'ada@example.com', password: 'good' } }, res);
  assert.equal(err, undefined);
  assert.equal(res.body.accessToken, 'access-token');
});

test('login rejects an unknown email and a wrong password', async () => {
  const err = await invoke(auth.login, { body: { email: 'x@y.z', password: 'good' } }, fakeRes());
  assert.equal(err.status, 401);

  userModel.findByEmailWithHash.mock.mockImplementation(async () => ({ password_hash: 'hashed' }));
  const err2 = await invoke(auth.login, { body: { email: 'x@y.z', password: 'bad' } }, fakeRes());
  assert.equal(err2.status, 401);
});

test('refresh requires a refresh cookie', async () => {
  const err = await invoke(auth.refresh, { cookies: {} }, fakeRes());
  assert.equal(err.status, 401);
});

test('refresh rejects an invalid token', async () => {
  const err = await invoke(auth.refresh, { cookies: { refresh_token: 'bad' } }, fakeRes());
  assert.equal(err.status, 401);
});

test('refresh revokes the family when the stored token is unknown', async () => {
  const err = await invoke(auth.refresh, { cookies: { refresh_token: 'refresh-token' } }, fakeRes());
  assert.equal(err.status, 401);
  assert.equal(refreshTokenModel.revokeAllForUser.mock.callCount(), 1);
});

test('refresh revokes the family when the stored token was revoked or expired', async () => {
  refreshTokenModel.findByHash.mock.mockImplementation(async () => ({
    id: 't1',
    revoked_at: new Date(),
    expires_at: new Date(Date.now() + 1000),
  }));
  const err = await invoke(auth.refresh, { cookies: { refresh_token: 'refresh-token' } }, fakeRes());
  assert.equal(err.status, 401);

  refreshTokenModel.findByHash.mock.mockImplementation(async () => ({
    id: 't1',
    revoked_at: null,
    expires_at: new Date(Date.now() - 1000),
  }));
  const err2 = await invoke(auth.refresh, { cookies: { refresh_token: 'refresh-token' } }, fakeRes());
  assert.equal(err2.status, 401);
});

test('refresh rejects a token whose account is gone', async () => {
  refreshTokenModel.findByHash.mock.mockImplementation(async () => ({
    id: 't1',
    revoked_at: null,
    expires_at: new Date(Date.now() + 1000),
  }));
  const err = await invoke(auth.refresh, { cookies: { refresh_token: 'refresh-token' } }, fakeRes());
  assert.equal(err.status, 401);
  assert.match(err.message, /no longer exists/);
});

test('refresh rotates the token and returns a new session', async () => {
  refreshTokenModel.findByHash.mock.mockImplementation(async () => ({
    id: 't1',
    revoked_at: null,
    expires_at: new Date(Date.now() + 1000),
  }));
  userModel.findById.mock.mockImplementation(async () => ({ id: 'u1', email: 'ada@example.com' }));

  const res = fakeRes();
  const err = await invoke(auth.refresh, { cookies: { refresh_token: 'refresh-token' } }, res);
  assert.equal(err, undefined);
  assert.equal(refreshTokenModel.revokeById.mock.callCount(), 1);
  assert.equal(res.body.accessToken, 'access-token');
});

test('logout revokes the presented token and clears the cookie', async () => {
  const res = fakeRes();
  const err = await invoke(auth.logout, { cookies: { refresh_token: 'refresh-token' } }, res);
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 204);
  assert.equal(refreshTokenModel.revokeByHash.mock.callCount(), 1);
  assert.equal(clearRefreshCookie.mock.callCount(), 1);
});

test('logout without a token still clears the cookie', async () => {
  refreshTokenModel.revokeByHash.mock.resetCalls();
  const res = fakeRes();
  await invoke(auth.logout, { cookies: {} }, res);
  assert.equal(refreshTokenModel.revokeByHash.mock.callCount(), 0);
  assert.equal(clearRefreshCookie.mock.callCount(), 1);
});

test('me returns the public representation of req.user', () => {
  const res = fakeRes();
  auth.me({ user: { id: 'u1', email: 'a@b.c', name: 'Ada', currency: 'USD' } }, res);
  assert.equal(res.body.user.id, 'u1');
  assert.equal(res.body.user.email, 'a@b.c');
  assert.equal(res.body.user.name, 'Ada');
  assert.equal(res.body.user.currency, 'USD');
});
