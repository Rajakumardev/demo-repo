import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import {
  expiryFromToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokens.js';

const user = { id: '123e4567-e89b-12d3-a456-426614174000', email: 'ada@example.com' };

test('access tokens round-trip and carry the user', () => {
  const token = signAccessToken(user);
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.email, user.email);
  assert.equal(payload.type, 'access');
});

test('verifyAccessToken rejects a token with the wrong type claim', () => {
  const token = jwt.sign({ sub: user.id, type: 'refresh' }, env.JWT_ACCESS_SECRET, {
    issuer: 'expense-manager',
  });
  assert.throws(() => verifyAccessToken(token), /Unexpected token type/);
});

test('refresh tokens round-trip and expose a jti', () => {
  const { token, jti } = signRefreshToken(user);
  assert.ok(jti);
  const payload = verifyRefreshToken(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.jti, jti);
  assert.equal(payload.type, 'refresh');
});

test('signRefreshToken accepts an explicit jti', () => {
  const { jti } = signRefreshToken(user, 'fixed-jti');
  assert.equal(jti, 'fixed-jti');
});

test('verifyRefreshToken rejects a token with the wrong type claim', () => {
  const token = jwt.sign({ sub: user.id, type: 'access' }, env.JWT_REFRESH_SECRET, {
    issuer: 'expense-manager',
  });
  assert.throws(() => verifyRefreshToken(token), /Unexpected token type/);
});

test('verify functions reject tampered tokens', () => {
  assert.throws(() => verifyAccessToken('not.a.jwt'));
});

test('hashToken is a deterministic sha256 hex digest', () => {
  const a = hashToken('abc');
  assert.equal(a, hashToken('abc'));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('expiryFromToken converts the exp claim to a Date', () => {
  const token = signAccessToken(user);
  const expiry = expiryFromToken(token);
  assert.ok(expiry instanceof Date);
  assert.ok(expiry.getTime() > Date.now());
});

test('expiryFromToken rejects tokens without an expiry', () => {
  const token = jwt.sign({ sub: user.id }, env.JWT_ACCESS_SECRET, { issuer: 'expense-manager' });
  assert.throws(() => expiryFromToken(token), /no expiry/);
});

test('expiryFromToken rejects undecodable input', () => {
  assert.throws(() => expiryFromToken('garbage'), /no expiry/);
});
