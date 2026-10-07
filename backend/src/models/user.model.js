import { query } from '../db/pool.js';

const PUBLIC_COLUMNS = 'id, email, name, currency, created_at, updated_at';

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findByEmail(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] || null;
}

/** Includes the password hash, for login only. */
export async function findByEmailWithHash(email) {
  const { rows } = await query(
    `SELECT id, email, name, currency, password_hash, created_at, updated_at
       FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] || null;
}

export async function create({ email, passwordHash, name, currency = 'USD' }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO users (email, password_hash, name, currency)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email.toLowerCase(), passwordHash, name, currency],
  );
  return rows[0];
}

export async function updateProfile(userId, { name, currency }) {
  const { rows } = await query(
    `UPDATE users
        SET name = COALESCE($2, name),
            currency = COALESCE($3, currency),
            updated_at = now()
      WHERE id = $1
      RETURNING ${PUBLIC_COLUMNS}`,
    [userId, name ?? null, currency ?? null],
  );
  return rows[0] || null;
}
