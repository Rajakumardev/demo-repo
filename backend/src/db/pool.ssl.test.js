import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Exercise the production-only branches: SSL enabled and the missing
// DATABASE_URL warning. `env.js` never overrides variables already present in
// `process.env`, so setting these before the import takes effect.
process.env.NODE_ENV = 'production';
process.env.POSTGRES_SSL = 'true';
delete process.env.DATABASE_URL;

class FakePool {
  constructor(options) {
    FakePool.options = options;
    this.query = mock.fn(async () => ({ rows: [] }));
    this.on = mock.fn();
    this.end = mock.fn(async () => {});
  }
}

mock.module('pg', {
  defaultExport: {
    Pool: FakePool,
    types: { builtins: { NUMERIC: 1700, INT8: 20 }, setTypeParser: mock.fn() },
  },
});

test('the pool enables SSL when POSTGRES_SSL=true', async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await import('./pool.js');
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(FakePool.options.ssl, { rejectUnauthorized: false });
});
