import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { validate } from './validate.js';
import { AppError } from '../utils/errors.js';

const schema = z.object({ name: z.string().trim().min(2) });

function run(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });
}

test('validate replaces req.body with the parsed value and continues', async () => {
  const req = { body: { name: ' Ada ' } };
  const err = await run(validate(schema), req);
  assert.equal(err, undefined);
  assert.deepEqual(req.body, { name: 'Ada' });
});

test('validate passes a 400 AppError with field details on failure', async () => {
  const req = { body: { name: 'x' } };
  const err = await run(validate(schema), req);
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 400);
  assert.equal(err.message, 'Validation failed');
  assert.deepEqual(err.details, { name: ['String must contain at least 2 character(s)'] });
});

test('validate supports a custom source', async () => {
  const req = { query: { name: 'abc' } };
  const err = await run(validate(schema, 'query'), req);
  assert.equal(err, undefined);
  assert.deepEqual(req.query, { name: 'abc' });
});

test('validate can redefine a read-only getter', async () => {
  const req = {};
  Object.defineProperty(req, 'query', {
    get: () => ({ name: 'raw' }),
    configurable: true,
  });
  const err = await run(validate(schema, 'query'), req);
  assert.equal(err, undefined);
  assert.deepEqual(req.query, { name: 'raw' });
});
