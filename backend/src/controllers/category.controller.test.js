import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '../utils/errors.js';

const categoryModel = {
  listByUser: mock.fn(async () => []),
  create: mock.fn(async () => ({ id: 'c1' })),
  update: mock.fn(async () => ({ id: 'c1' })),
  remove: mock.fn(async () => true),
};
mock.module('../models/category.model.js', { namedExports: categoryModel });

const controller = await import('./category.controller.js');

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
  categoryModel.listByUser.mock.mockImplementation(async () => []);
  categoryModel.create.mock.mockImplementation(async () => ({ id: 'c1' }));
  categoryModel.update.mock.mockImplementation(async () => ({ id: 'c1' }));
  categoryModel.remove.mock.mockImplementation(async () => true);
});

test('list returns the categories for the current user', async () => {
  categoryModel.listByUser.mock.mockImplementation(async () => [{ id: 'c1' }]);
  const res = fakeRes();
  const err = await invoke(controller.list, { user: { id: 'u1' } }, res);
  assert.equal(err, undefined);
  assert.deepEqual(res.body, { categories: [{ id: 'c1' }] });
  assert.deepEqual(categoryModel.listByUser.mock.calls[0].arguments, ['u1']);
});

test('create returns 201 with the new category', async () => {
  const res = fakeRes();
  const err = await invoke(controller.create, { user: { id: 'u1' }, body: { name: 'Food' } }, res);
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { category: { id: 'c1' } });
});

test('create maps a unique violation onto a conflict', async () => {
  categoryModel.create.mock.mockImplementation(async () => {
    throw Object.assign(new Error('dup'), { code: '23505' });
  });
  const err = await invoke(controller.create, { user: { id: 'u1' }, body: {} }, fakeRes());
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 409);
});

test('create forwards other errors', async () => {
  categoryModel.create.mock.mockImplementation(async () => {
    throw new Error('boom');
  });
  const err = await invoke(controller.create, { user: { id: 'u1' }, body: {} }, fakeRes());
  assert.equal(err.message, 'boom');
});

test('update returns the updated category', async () => {
  const res = fakeRes();
  const err = await invoke(
    controller.update,
    { user: { id: 'u1' }, params: { id: 'c1' }, body: { name: 'New' } },
    res,
  );
  assert.equal(err, undefined);
  assert.deepEqual(res.body, { category: { id: 'c1' } });
});

test('update returns 404 when no category matched', async () => {
  categoryModel.update.mock.mockImplementation(async () => null);
  const err = await invoke(controller.update, { user: { id: 'u1' }, params: { id: 'c1' }, body: {} }, fakeRes());
  assert.equal(err.status, 404);
});

test('update maps a unique violation onto a conflict', async () => {
  categoryModel.update.mock.mockImplementation(async () => {
    throw Object.assign(new Error('dup'), { code: '23505' });
  });
  const err = await invoke(controller.update, { user: { id: 'u1' }, params: { id: 'c1' }, body: {} }, fakeRes());
  assert.equal(err.status, 409);
});

test('update forwards other errors', async () => {
  categoryModel.update.mock.mockImplementation(async () => {
    throw new Error('boom');
  });
  const err = await invoke(controller.update, { user: { id: 'u1' }, params: { id: 'c1' }, body: {} }, fakeRes());
  assert.equal(err.message, 'boom');
});

test('remove returns 204 when a category was deleted', async () => {
  const res = fakeRes();
  const err = await invoke(controller.remove, { user: { id: 'u1' }, params: { id: 'c1' } }, res);
  assert.equal(err, undefined);
  assert.equal(res.statusCode, 204);
});

test('remove returns 404 when nothing matched', async () => {
  categoryModel.remove.mock.mockImplementation(async () => false);
  const err = await invoke(controller.remove, { user: { id: 'u1' }, params: { id: 'c1' } }, fakeRes());
  assert.equal(err.status, 404);
});
