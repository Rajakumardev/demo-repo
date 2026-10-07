import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const readdir = mock.fn(async () => []);
const readFile = mock.fn(async () => 'SELECT 1;');
mock.module('node:fs/promises', { namedExports: { readdir, readFile } });

const clientQuery = mock.fn(async () => ({ rows: [] }));
const release = mock.fn();
const connect = mock.fn(async () => ({ query: clientQuery, release }));

mock.module('./pool.js', {
  namedExports: { pool: { connect }, closePool: mock.fn(), query: mock.fn() },
});

const { runMigrations } = await import('./migrate.js');

test.beforeEach(() => {
  readdir.mock.resetCalls();
  readFile.mock.resetCalls();
  clientQuery.mock.resetCalls();
  release.mock.resetCalls();
  connect.mock.resetCalls();
  readdir.mock.mockImplementation(async () => ['001_init.sql', '002_more.sql', 'README.txt']);
  readFile.mock.mockImplementation(async () => 'SELECT 1;');
  clientQuery.mock.mockImplementation(async (sql) => {
    if (typeof sql === 'string' && sql.includes('SELECT name FROM schema_migrations')) {
      return { rows: [{ name: '001_init.sql' }] };
    }
    return { rows: [] };
  });
});

test('runMigrations applies only unapplied migrations in order', async () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    await runMigrations();
  } finally {
    console.log = originalLog;
  }

  const statements = clientQuery.mock.calls.map((c) => c.arguments[0]);
  assert.equal(statements.filter((s) => s === 'BEGIN').length, 1);
  assert.equal(statements.filter((s) => s === 'COMMIT').length, 1);
  assert.ok(statements.some((s) => s.includes('INSERT INTO schema_migrations')));
  assert.equal(readFile.mock.callCount(), 1);
  assert.match(readFile.mock.calls[0].arguments[0], /002_more\.sql$/);
  assert.equal(release.mock.callCount(), 1);
});

test('runMigrations reports when the schema is up to date', async () => {
  readdir.mock.mockImplementation(async () => ['001_init.sql']);
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await runMigrations();
  } finally {
    console.log = originalLog;
  }
  assert.ok(logs.some((line) => line.includes('up to date')));
});

test('runMigrations rolls back a failing migration', async () => {
  clientQuery.mock.mockImplementation(async (sql) => {
    if (typeof sql === 'string' && sql.includes('SELECT name FROM schema_migrations')) {
      return { rows: [] };
    }
    if (typeof sql === 'string' && sql.includes('SELECT 1;')) {
      throw new Error('bad sql');
    }
    return { rows: [] };
  });

  const originalLog = console.log;
  console.log = () => {};
  try {
    await assert.rejects(runMigrations(), /bad sql/);
  } finally {
    console.log = originalLog;
  }

  const statements = clientQuery.mock.calls.map((c) => c.arguments[0]);
  assert.ok(statements.includes('ROLLBACK'));
  assert.equal(release.mock.callCount(), 1);
});
