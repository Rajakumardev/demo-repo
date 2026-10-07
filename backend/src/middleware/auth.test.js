import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { signAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/errors.js';

const findById = mock.fn(async () => null);
mock.module('../models/user.model.js', { namedExports: { findById } });

const { requireAuth } = await import('./auth.js');

const user = { id: '123e4567-e89b-12d3-a456-426614174000', email: 'ada@example.com' };

function invoke(headers) {
  const req = { headers };
  return new Promise((resolve) => {
    requireAuth(req, {}, (err) => resolve({ err, req }));
  });
}

test.beforeEach(() => {
  findById.mock.resetCalls();
  findById.mock.mockImplementation(async () => null);
});

test('requireAuth rejects a missing Authorization header', async () => {
  const { err } = await invoke({});
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 401);
  assert.match(err.message, /Missing or malformed/);
});

test('requireAuth rejects a malformed Authorization header', async () => {
  const { err } = await invoke({ authorization: 'Token abc' });
  assert.equal(err.status, 401);
  assert.match(err.message, /Missing or malformed/);
});

test('requireAuth rejects an invalid token', async () => {
  const { err } = await invoke({ authorization: 'Bearer not-a-jwt' });
  assert.equal(err.status, 401);
  assert.match(err.message, /Invalid or expired/);
});

test('requireAuth rejects a token whose account no longer exists', async () => {
  const token = signAccessToken(user);
  const { err } = await invoke({ authorization: `Bearer ${token}` });
  assert.equal(err.status, 401);
  assert.match(err.message, /no longer exists/);
});

test('requireAuth attaches the user on success', async () => {
  findById.mock.mockImplementation(async () => user);
  const token = signAccessToken(user);
  const { err, req } = await invoke({ authorization: `Bearer ${token}` });
  assert.equal(err, undefined);
  assert.deepEqual(req.user, user);
  assert.deepEqual(findById.mock.calls[0].arguments, [user.id]);
});
