import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const query = mock.fn(async () => ({ rows: [], rowCount: 0 }));
mock.module('../db/pool.js', { namedExports: { query: (...args) => query(...args) } });

const expenseModel = await import('./expense.model.js');

test.beforeEach(() => {
  query.mock.resetCalls();
});

test('listByUser applies default sort, limit and offset', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  await expenseModel.listByUser('u1');
  const [sql, params] = query.mock.calls[0].arguments;
  assert.match(sql, /ORDER BY e\.spent_at DESC/);
  assert.deepEqual(params, ['u1', 50, 0]);
});

test('listByUser builds filters for from, to, category and search', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  await expenseModel.listByUser('u1', {
    from: '2026-01-01',
    to: '2026-01-31',
    categoryId: 'c1',
    search: 'coffee',
    sort: 'amount_asc',
    limit: 10,
    offset: 5,
  });
  const [sql, params] = query.mock.calls[0].arguments;
  assert.match(sql, /e\.spent_at >= \$2::date/);
  assert.match(sql, /e\.spent_at < \(\$3::date \+ INTERVAL '1 day'\)/);
  assert.match(sql, /e\.category_id = \$4/);
  assert.match(sql, /e\.description ILIKE \$5/);
  assert.match(sql, /ORDER BY e\.amount ASC/);
  assert.deepEqual(params, ['u1', '2026-01-01', '2026-01-31', 'c1', '%coffee%', 10, 5]);
});

test('listByUser falls back to the default sort for an unknown key', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  await expenseModel.listByUser('u1', { sort: 'nonsense' });
  assert.match(query.mock.calls[0].arguments[0], /ORDER BY e\.spent_at DESC/);
});

test('countByUser returns the aggregate row', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ total: 3, amount: 42 }] }));
  assert.deepEqual(await expenseModel.countByUser('u1'), { total: 3, amount: 42 });
});

test('findById returns the row or null', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await expenseModel.findById('u1', 'e1'), null);
});

test('create inserts then reloads the expense', async () => {
  let call = 0;
  query.mock.mockImplementation(async () => {
    call += 1;
    return call === 1 ? { rows: [{ id: 'e1' }] } : { rows: [{ id: 'e1', amount: 5 }] };
  });
  const created = await expenseModel.create('u1', { amount: 5 });
  assert.deepEqual(created, { id: 'e1', amount: 5 });
  assert.deepEqual(query.mock.calls[0].arguments[1], ['u1', 5, '', null, null]);
});

test('update maps camelCase fields to columns', async () => {
  let call = 0;
  query.mock.mockImplementation(async () => {
    call += 1;
    return call === 1 ? { rows: [{ id: 'e1' }] } : { rows: [{ id: 'e1' }] };
  });
  await expenseModel.update('u1', 'e1', {
    amount: 9,
    description: 'lunch',
    spentAt: '2026-01-02',
    categoryId: 'c1',
  });
  const [sql, params] = query.mock.calls[0].arguments;
  assert.match(sql, /amount = \$1/);
  assert.match(sql, /spent_at = \$3/);
  assert.match(sql, /category_id = \$4/);
  assert.deepEqual(params, [9, 'lunch', '2026-01-02', 'c1', 'u1', 'e1']);
});

test('update with no fields reloads instead of writing', async () => {
  query.mock.mockImplementation(async () => ({ rows: [{ id: 'e1' }] }));
  await expenseModel.update('u1', 'e1', {});
  assert.match(query.mock.calls[0].arguments[0], /SELECT/);
});

test('update returns null when the row does not exist', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await expenseModel.update('u1', 'e1', { amount: 1 }), null);
});

test('remove reports whether a row was deleted', async () => {
  query.mock.mockImplementation(async () => ({ rowCount: 1 }));
  assert.equal(await expenseModel.remove('u1', 'e1'), true);
  query.mock.mockImplementation(async () => ({ rowCount: 0 }));
  assert.equal(await expenseModel.remove('u1', 'e1'), false);
});

test('summary returns totals, per-category and per-month breakdowns', async () => {
  query.mock.mockImplementation(async (sql) => {
    if (sql.includes('SUM(e.amount), 0) AS total') && sql.includes('count(*)::int            AS count')) {
      return { rows: [{ total: 10, count: 2 }] };
    }
    if (sql.includes('GROUP BY c.id')) return { rows: [{ name: 'Food', total: 10 }] };
    return { rows: [{ month: '2026-01', total: 10 }] };
  });

  const result = await expenseModel.summary('u1', { from: '2026-01-01', to: '2026-01-31' });
  assert.deepEqual(result.totals, { total: 10, count: 2 });
  assert.equal(result.byCategory.length, 1);
  assert.equal(result.byMonth[0].month, '2026-01');
  assert.equal(query.mock.callCount(), 3);
});
