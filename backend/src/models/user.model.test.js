import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const query = mock.fn(async () => ({ rows: [] }));
mock.module('../db/pool.js', { namedExports: { query: (...args) => query(...args) } });

const userModel = await import('./user.model.js');

test.beforeEach(() => {
  query.mock.resetCalls();
});

test('findById returns the row or null', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'u1' }] }));
  assert.deepEqual(await userModel.findById('u1'), { id: 'u1' });
  assert.deepEqual(query.mock.calls[0].arguments, [
    'SELECT id, email, name, currency, created_at, updated_at FROM users WHERE id = $1',
    ['u1'],
  ]);
});

test('findByEmail returns null when there is no match', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await userModel.findByEmail('nobody@example.com'), null);
});

test('findByEmailWithHash includes the password hash query', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'u1', password_hash: 'h' }] }));
  const row = await userModel.findByEmailWithHash('a@b.com');
  assert.equal(row.password_hash, 'h');
  assert.match(query.mock.calls[0].arguments[0], /password_hash/);
});

test('create lowercases the email and uses the default currency', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'u1' }] }));
  await userModel.create({ email: 'ADA@Example.com', passwordHash: 'h', name: 'Ada' });
  const [sql, params] = query.mock.calls[0].arguments;
  assert.match(sql, /INSERT INTO users/);
  assert.deepEqual(params, ['ada@example.com', 'h', 'Ada', 'USD']);
});

test('create runs through a provided transaction client', async () => {
  const clientQuery = mock.fn(async () => ({ rows: [{ id: 'u2' }] }));
  const client = { query: clientQuery };
  await userModel.create({ email: 'a@b.com', passwordHash: 'h', name: 'A', currency: 'EUR' }, client);
  assert.equal(query.mock.callCount(), 0);
  assert.equal(clientQuery.mock.callCount(), 1);
  assert.deepEqual(clientQuery.mock.calls[0].arguments[1], ['a@b.com', 'h', 'A', 'EUR']);
});

test('updateProfile coalesces optional fields', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await userModel.updateProfile('u1', { name: 'Ada' }), null);
  const [, params] = query.mock.calls[0].arguments;
  assert.deepEqual(params, ['u1', 'Ada', null]);
});
