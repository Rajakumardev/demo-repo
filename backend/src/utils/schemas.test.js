import test from 'node:test';
import assert from 'node:assert/strict';

import {
  categoryCreateSchema,
  categoryUpdateSchema,
  expenseCreateSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  idParamSchema,
  loginSchema,
  registerSchema,
  summaryQuerySchema,
} from './schemas.js';

test('registerSchema normalises email and accepts a currency', () => {
  const parsed = registerSchema.parse({
    name: '  Ada  ',
    email: '  ADA@Example.com ',
    password: 'supersecret',
    currency: 'usd',
  });
  assert.equal(parsed.name, 'Ada');
  assert.equal(parsed.email, 'ada@example.com');
  assert.equal(parsed.currency, 'USD');
});

test('registerSchema rejects a short password and bad email', () => {
  const result = registerSchema.safeParse({ name: 'A', email: 'nope', password: 'short' });
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(result.error.flatten().fieldErrors).sort(), ['email', 'password']);
});

test('loginSchema requires a valid email and a password', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
});

test('idParamSchema requires a uuid', () => {
  assert.equal(idParamSchema.safeParse({ id: 'not-a-uuid' }).success, false);
  assert.equal(
    idParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }).success,
    true,
  );
});

test('categoryCreateSchema applies defaults through the model, validates hex colors', () => {
  assert.equal(categoryCreateSchema.safeParse({ name: 'Food' }).success, true);
  assert.equal(
    categoryCreateSchema.safeParse({ name: 'Food', color: '#abc', icon: 'tag' }).success,
    true,
  );
  assert.equal(categoryCreateSchema.safeParse({ name: 'Food', color: 'red' }).success, false);
});

test('categoryUpdateSchema requires at least one field', () => {
  assert.equal(categoryUpdateSchema.safeParse({}).success, false);
  assert.equal(categoryUpdateSchema.safeParse({ color: '#ffffff' }).success, true);
});

test('expenseCreateSchema coerces amount and date', () => {
  const parsed = expenseCreateSchema.parse({ amount: '12.5', spentAt: '2026-01-02' });
  assert.equal(parsed.amount, 12.5);
  assert.equal(parsed.description, '');
  assert.ok(parsed.spentAt instanceof Date);
  assert.equal(expenseCreateSchema.safeParse({ amount: 0 }).success, false);
  assert.equal(expenseCreateSchema.safeParse({ amount: 2_000_000_000 }).success, false);
});

test('expenseUpdateSchema requires at least one field', () => {
  assert.equal(expenseUpdateSchema.safeParse({}).success, false);
  assert.equal(expenseUpdateSchema.safeParse({ amount: 5 }).success, true);
});

test('expenseQuerySchema applies defaults and validates enums/ids', () => {
  const parsed = expenseQuerySchema.parse({});
  assert.equal(parsed.sort, 'date_desc');
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.offset, 0);

  assert.equal(
    expenseQuerySchema.safeParse({ sort: 'amount_asc', limit: '5', offset: '2' }).success,
    true,
  );
  assert.equal(expenseQuerySchema.safeParse({ sort: 'nope' }).success, false);
  assert.equal(expenseQuerySchema.safeParse({ limit: 0 }).success, false);
  assert.equal(expenseQuerySchema.safeParse({ from: '01-01-2026' }).success, false);
  assert.equal(expenseQuerySchema.safeParse({ categoryId: 'x' }).success, false);
});

test('summaryQuerySchema validates date range', () => {
  assert.equal(summaryQuerySchema.safeParse({ from: '2026-01-01', to: '2026-02-01' }).success, true);
  assert.equal(summaryQuerySchema.safeParse({ from: 'bad' }).success, false);
});
