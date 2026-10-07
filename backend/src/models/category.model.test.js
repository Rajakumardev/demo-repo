import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const query = mock.fn(async () => ({ rows: [], rowCount: 0 }));
mock.module('../db/pool.js', { namedExports: { query: (...args) => query(...args) } });

const categoryModel = await import('./category.model.js');

test.beforeEach(() => {
  query.mock.resetCalls();
});

test('DEFAULT_CATEGORIES ships the starter set', () => {
  assert.equal(categoryModel.DEFAULT_CATEGORIES.length, 8);
  assert.ok(categoryModel.DEFAULT_CATEGORIES.every((c) => c.name && c.color && c.icon));
});

test('listByUser returns rows', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'c1' }] }));
  assert.deepEqual(await categoryModel.listByUser('u1'), [{ id: 'c1' }]);
});

test('findById returns the row or null', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await categoryModel.findById('u1', 'c1'), null);
});

test('create applies default color and icon', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'c1' }] }));
  await categoryModel.create('u1', { name: 'Food' });
  assert.deepEqual(query.mock.calls[0].arguments[1], ['u1', 'Food', '#6366f1', 'tag']);
});

test('create uses a provided client when given one', async () => {
  const clientQuery = mock.fn(async () => ({ rows: [{ id: 'c2' }] }));
  await categoryModel.create('u1', { name: 'X', color: '#fff', icon: 'tag' }, { query: clientQuery });
  assert.equal(query.mock.callCount(), 0);
  assert.equal(clientQuery.mock.callCount(), 1);
});

test('createMany creates every item in order', async () => {
  const clientQuery = mock.fn(async () => ({ rows: [{ id: 'c' }] }));
  const created = await categoryModel.createMany('u1', [{ name: 'a' }, { name: 'b' }], {
    query: clientQuery,
  });
  assert.equal(created.length, 2);
  assert.equal(clientQuery.mock.callCount(), 2);
});

test('update builds a SET clause only for provided fields', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'c1' }] }));
  const row = await categoryModel.update('u1', 'c1', { name: 'New', color: '#000000' });
  assert.deepEqual(row, { id: 'c1' });
  const [sql, params] = query.mock.calls[0].arguments;
  assert.match(sql, /name = \$1/);
  assert.match(sql, /color = \$2/);
  assert.match(sql, /updated_at = now\(\)/);
  assert.deepEqual(params, ['New', '#000000', 'u1', 'c1']);
});

test('update with no known fields falls back to findById', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await categoryModel.update('u1', 'c1', { unknown: true }), null);
  assert.match(query.mock.calls[0].arguments[0], /SELECT/);
});

test('update returns null when nothing matched', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await categoryModel.update('u1', 'c1', { name: 'x' }), null);
});

test('remove reports whether a row was deleted', async () => {
  query.mock.mockImplementation(async () => ({ rowCount: 1 }));
  assert.equal(await categoryModel.remove('u1', 'c1'), true);
  query.mock.mockImplementation(async () => ({ rowCount: 0 }));
  assert.equal(await categoryModel.remove('u1', 'c1'), false);
});
