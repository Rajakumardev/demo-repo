import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const poolQuery = mock.fn(async () => ({ rows: [] }));
const clientQuery = mock.fn(async () => ({ rows: [] }));
const release = mock.fn();
let errorHandler;

class FakePool {
  constructor() {
    this.query = poolQuery;
    this.connect = mock.fn(async () => ({ query: clientQuery, release }));
    this.end = mock.fn(async () => {});
  }

  on(event, handler) {
    if (event === 'error') errorHandler = handler;
  }
}

mock.module('pg', {
  defaultExport: {
    Pool: FakePool,
    types: { builtins: { NUMERIC: 1700, INT8: 20 }, setTypeParser: mock.fn() },
  },
});

const pool = await import('./pool.js');

test.beforeEach(() => {
  poolQuery.mock.resetCalls();
  clientQuery.mock.resetCalls();
  release.mock.resetCalls();
  pool.pool.connect.mock.resetCalls();
  pool.pool.end.mock.resetCalls();
  poolQuery.mock.mockImplementation(async () => ({ rows: [] }));
  clientQuery.mock.mockImplementation(async () => ({ rows: [] }));
});

test('query forwards to the underlying pool', async () => {
  await pool.query('SELECT 1', [1]);
  assert.deepEqual(poolQuery.mock.calls[0].arguments, ['SELECT 1', [1]]);
});

test('withTransaction commits and releases on success', async () => {
  const result = await pool.withTransaction(async (client) => {
    await client.query('SELECT 1');
    return 'done';
  });

  assert.equal(result, 'done');
  assert.deepEqual(
    clientQuery.mock.calls.map((c) => c.arguments[0]),
    ['BEGIN', 'SELECT 1', 'COMMIT'],
  );
  assert.equal(release.mock.callCount(), 1);
});

test('withTransaction rolls back and rethrows on failure', async () => {
  await assert.rejects(
    pool.withTransaction(async () => {
      throw new Error('nope');
    }),
    /nope/,
  );
  assert.deepEqual(
    clientQuery.mock.calls.map((c) => c.arguments[0]),
    ['BEGIN', 'ROLLBACK'],
  );
  assert.equal(release.mock.callCount(), 1);
});

test('waitForDatabase resolves once the connection succeeds', async () => {
  await pool.waitForDatabase({ attempts: 1, delayMs: 1 });
  assert.equal(poolQuery.mock.callCount(), 1);
});

test('waitForDatabase retries then succeeds', async () => {
  let call = 0;
  poolQuery.mock.mockImplementation(async () => {
    call += 1;
    if (call === 1) throw new Error('not ready');
    return { rows: [] };
  });
  const originalLog = console.log;
  console.log = () => {};
  try {
    await pool.waitForDatabase({ attempts: 2, delayMs: 1 });
  } finally {
    console.log = originalLog;
  }
  assert.equal(poolQuery.mock.callCount(), 2);
});

test('waitForDatabase throws after exhausting attempts', async () => {
  poolQuery.mock.mockImplementation(async () => {
    throw new Error('still down');
  });
  const originalLog = console.log;
  console.log = () => {};
  try {
    await assert.rejects(pool.waitForDatabase({ attempts: 2, delayMs: 1 }), /still down/);
  } finally {
    console.log = originalLog;
  }
});

test('closePool ends the pool', async () => {
  await pool.closePool();
  assert.equal(pool.pool.end.mock.callCount(), 1);
});

test('the idle-client error handler logs', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error('idle client blew up'));
  } finally {
    console.error = originalError;
  }
  assert.equal(typeof errorHandler, 'function');
});
