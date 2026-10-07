import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '../utils/errors.js';

const categoryModel = {
  findById: mock.fn(async () => null),
};
const expenseModel = {
  listByUser: mock.fn(async () => []),
  countByUser: mock.fn(async () => ({ total: 0, amount: 0 })),
  summary: mock.fn(async () => ({ totals: {}, byCategory: [], byMonth: [] })),
  findById: mock.fn(async () => null),
  create: mock.fn(async () => ({ id: 'e1' })),
  update: mock.fn(async () => ({ id: 'e1' })),
  remove: mock.fn(async () => true),
};
mock.module('../models/category.model.js', { namedExports: categoryModel });
mock.module('../models/expense.model.js', { namedExports: expenseModel });

const controller = await import('./expense.controller.js');

function fakeRes() {
  return {
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
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function invoke(handler, req, res) {
  let nextErr;
  await handler(req, res, (err) => {
    nextErr = err;
  });
  return nextErr;
}

test.beforeEach(() => {
  for (const fn of Object.values(categoryModel)) fn.mock.resetCalls();
  for (const fn of Object.values(expenseModel)) fn.mock.resetCalls();
  categoryModel.findById.mock.mockImplementation(async () => null);
  expenseModel.listByUser.mock.mockImplementation(async () => []);
  expenseModel.countByUser.mock.mockImplementation(async () => ({ total: 0, amount: 0 }));
  expenseModel.summary.mock.mockImplementation(async () => ({ totals: {}, byCategory: [], byMonth: [] }));
  expenseModel.findById.mock.mockImplementation(async () => null);
  expenseModel.create.mock.mockImplementation(async () => ({ id: 'e1' }));
  expenseModel.update.mock.mockImplementation(async () => ({ id: 'e1' }));
  expenseModel.remove.mock.mockImplementation(async () => true);
});

test('list returns expenses and pagination meta', async () => {
  expenseModel.listByUser.mock.mockImplementation(async () => [{ id: 'e1' }]);
  expenseModel.countByUser.mock.mockImplementation(async () => ({ total: 1, amount: 9 }));
  const res = fakeRes();
  const err = await invoke(
    controller.list,
    { user: { id: 'u1' }, query: { limit: 50, offset: 0 } },
    res,
  );
  assert.equal(err, undefined);
  assert.deepEqual(res.body.expenses, [{ id: 'e1' }]);
  assert.deepEqual(res.body.meta, { total: 1, amount: 9, limit: 50, offset: 0 });
});

test('summary returns the aggregated data', async () => {
  expenseModel.summary.mock.mockImplementation(async () => ({ totals: { total: 5 } }));
  const res = fakeRes();
  const err = await invoke(controller.summary, { user: { id: 'u1' }, query: {} }, res);
  assert.equal(err, undefined);
  assert.deepEqual(res.body, { totals: { total: 5 } });
});

test('get returns 404 when the expense is missing', async () => {
  const err = await invoke(controller.get, { user: { id: 'u1' }, params: { id: 'e1' } }, fakeRes());
  assert.equal(err.status, 404);
});

test('get returns the expense', async () => {
  expenseModel.findById.mock.mockImplementation(async () => ({ id: 'e1' }));
  const res = fakeRes();
  const err = await invoke(controller.get, { user: { id: 'u1' }, params: { id: 'e1' } }, res);
  assert.equal(err, undefined);
  assert.deepEqual(res.body, { expense: { id: 'e1' } });
});

test('create skips the category check when no category is given', async () => {
  const res = fakeRes();
  const err = await invoke(
    controller.create,
    { user: { id: 'u1' }, body: { amount: 5, categoryId: null } },
    res,
  );
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(categoryModel.findById.mock.callCount(), 0);
});

test('create rejects a category that does not belong to the user', async () => {
  const err = await invoke(
    controller.create,
    { user: { id: 'u1' }, body: { amount: 5, categoryId: 'c1' } },
    fakeRes(),
  );
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 400);
});

test('create accepts an owned category', async () => {
  categoryModel.findById.mock.mockImplementation(async () => ({ id: 'c1' }));
  const res = fakeRes();
  const err = await invoke(
    controller.create,
    { user: { id: 'u1' }, body: { amount: 5, categoryId: 'c1' } },
    res,
  );
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 201);
});

test('update returns 404 when the expense is missing', async () => {
  expenseModel.update.mock.mockImplementation(async () => null);
  const err = await invoke(
    controller.update,
    { user: { id: 'u1' }, params: { id: 'e1' }, body: { amount: 5 } },
    fakeRes(),
  );
  assert.equal(err.status, 404);
});

test('update returns the updated expense', async () => {
  const res = fakeRes();
  const err = await invoke(
    controller.update,
    { user: { id: 'u1' }, params: { id: 'e1' }, body: { amount: 5 } },
    res,
  );
  assert.equal(err, undefined);
  assert.deepEqual(res.body, { expense: { id: 'e1' } });
});

test('remove returns 204 when an expense was deleted', async () => {
  const res = fakeRes();
  const err = await invoke(controller.remove, { user: { id: 'u1' }, params: { id: 'e1' } }, res);
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 204);
});

test('remove returns 404 when nothing matched', async () => {
  expenseModel.remove.mock.mockImplementation(async () => false);
  const err = await invoke(controller.remove, { user: { id: 'u1' }, params: { id: 'e1' } }, fakeRes());
  assert.equal(err.status, 404);
});
