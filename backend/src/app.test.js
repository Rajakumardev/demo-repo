import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from './app.js';

const app = createApp();

test('GET /api/health reports ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(typeof res.body.uptime === 'number');
});

test('unknown routes return a JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.message, 'Route GET /api/does-not-exist not found');
});

test('malformed JSON bodies are rejected with 400', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{ not json');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.message, 'Malformed JSON body');
});

test('invalid payloads fail validation with field details', async () => {
  const res = await request(app).post('/api/auth/login').send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.error.message, 'Validation failed');
  assert.ok(res.body.error.details.email);
});

test('protected routes require authentication', async () => {
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 401);
  assert.match(res.body.error.message, /Authorization/);
});

test('users cannot reach the API without a valid token', async () => {
  const res = await request(app).get('/api/expenses').set('Authorization', 'Bearer nope');
  assert.equal(res.status, 401);
});
