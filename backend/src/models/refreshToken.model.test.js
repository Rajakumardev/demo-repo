import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const query = mock.fn(async () => ({ rows: [] }));
mock.module('../db/pool.js', { namedExports: { query: (...args) => query(...args) } });

const refreshTokenModel = await import('./refreshToken.model.js');

test.beforeEach(() => {
  query.mock.resetCalls();
});

test('store persists the session through the pool', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  await refreshTokenModel.store({
    jti: 'j1',
    userId: 'u1',
    tokenHash: 'hash',
    expiresAt: new Date('2026-02-01'),
  });
  assert.deepEqual(query.mock.calls[0].arguments[1], ['j1', 'u1', 'hash', new Date('2026-02-01')]);
});

test('store uses a provided transaction client', async () => {
  const clientQuery = mock.fn(async () => ({ rows: [] }));
  await refreshTokenModel.store({
    jti: 'j2',
    userId: 'u1',
    tokenHash: 'hash',
    expiresAt: new Date(),
    client: { query: clientQuery },
  });
  assert.equal(query.mock.callCount(), 0);
  assert.equal(clientQuery.mock.callCount(), 1);
});

test('findByHash returns the row or null', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await refreshTokenModel.findByHash('hash'), null);
});

test('revoke helpers issue updates', async () => {
  query.mock.mockImplementation(async () => ({ rows: [] }));
  await refreshTokenModel.revokeByHash('hash');
  await refreshTokenModel.revokeById('j1');
  await refreshTokenModel.revokeAllForUser('u1');
  await refreshTokenModel.deleteExpired();

  assert.equal(query.mock.callCount(), 4);
  assert.match(query.mock.calls[0].arguments[0], /WHERE token_hash = \$1/);
  assert.match(query.mock.calls[1].arguments[0], /WHERE id = \$1/);
  assert.match(query.mock.calls[2].arguments[0], /WHERE user_id = \$1/);
  assert.match(query.mock.calls[3].arguments[0], /DELETE FROM refresh_tokens/);
});
