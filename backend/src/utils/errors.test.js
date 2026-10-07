import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError, badRequest, conflict, forbidden, notFound, unauthorized } from './errors.js';

test('AppError carries status, details and is exposed', () => {
  const err = new AppError(418, 'teapot', { hint: 'brew' });
  assert.equal(err.name, 'AppError');
  assert.equal(err.status, 418);
  assert.equal(err.message, 'teapot');
  assert.deepEqual(err.details, { hint: 'brew' });
  assert.equal(err.expose, true);
  assert.ok(err instanceof Error);
});

test('badRequest builds a 400 with default and custom detail', () => {
  assert.equal(badRequest().status, 400);
  assert.equal(badRequest().message, 'Bad request');
  assert.deepEqual(badRequest('nope', { field: 'x' }).details, { field: 'x' });
});

test('unauthorized, forbidden and notFound build the right statuses', () => {
  assert.equal(unauthorized().status, 401);
  assert.equal(unauthorized('gone').message, 'gone');
  assert.equal(forbidden().status, 403);
  assert.equal(notFound().status, 404);
  assert.equal(notFound('missing').message, 'missing');
});

test('conflict builds a 409 with details', () => {
  const err = conflict('duplicate', { email: 'taken' });
  assert.equal(err.status, 409);
  assert.equal(err.message, 'duplicate');
  assert.deepEqual(err.details, { email: 'taken' });
});
