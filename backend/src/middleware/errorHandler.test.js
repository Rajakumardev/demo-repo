import test from 'node:test';
import assert from 'node:assert/strict';

import { notFoundHandler, errorHandler } from './errorHandler.js';
import { AppError } from '../utils/errors.js';

function fakeRes() {
  const res = {
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
  };
  return res;
}

test('notFoundHandler reports the missing route', () => {
  const res = fakeRes();
  notFoundHandler({ method: 'GET', originalUrl: '/api/missing' }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.message, 'Route GET /api/missing not found');
});

test('errorHandler exposes AppError status and details', () => {
  const res = fakeRes();
  errorHandler(new AppError(409, 'Conflict', { name: 'taken' }), {}, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { error: { message: 'Conflict', details: { name: 'taken' } } });
});

test('errorHandler handles malformed JSON bodies', () => {
  const res = fakeRes();
  errorHandler({ type: 'entity.parse.failed' }, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.message, 'Malformed JSON body');
});

test('errorHandler hides unexpected 500 details', () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error('database exploded'), {}, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.message, 'Internal server error');
});

test('errorHandler honours a non-AppError with its own status and expose flag', () => {
  const res = fakeRes();
  const err = Object.assign(new Error('rate limited'), { status: 429, expose: true });
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error.message, 'rate limited');
});
