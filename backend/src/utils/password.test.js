import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword } from './password.js';

test('hashPassword produces a verifiable bcrypt hash', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.notEqual(hash, 'correct horse battery staple');
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('verifyPassword rejects a wrong password', async () => {
  const hash = await hashPassword('s3cret-password');
  assert.equal(await verifyPassword('wrong-password', hash), false);
});
