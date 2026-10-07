import pg from 'pg';
import { databaseUrl, isProduction } from '../config/env.js';

const { Pool } = pg;

// `numeric` (DECIMAL) values are returned as strings by node-postgres to avoid
// precision loss. Money amounts fit comfortably in a JS number for this app,
// so parse them for convenience.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => parseFloat(value));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

/** Run a single parameterised query against the pool. */
export const query = (text, params) => pool.query(text, params);

/**
 * Run `fn` inside a transaction, passing a dedicated client. Commits on
 * success and rolls back on failure.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Poll Postgres until it accepts connections (or the attempts run out). Useful
 * during container start-up where the database may still be booting.
 */
export async function waitForDatabase({ attempts = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      // eslint-disable-next-line no-console
      console.log(`Waiting for database… (${attempt}/${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function closePool() {
  await pool.end();
}

if (isProduction && !process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set; using discrete POSTGRES_* variables.');
}
