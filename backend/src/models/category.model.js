import { query } from '../db/pool.js';

const COLUMNS = 'id, user_id, name, color, icon, created_at, updated_at';

/** Starter categories seeded for every new account. */
export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#f97316', icon: 'utensils' },
  { name: 'Transport', color: '#0ea5e9', icon: 'car' },
  { name: 'Bills & Utilities', color: '#a855f7', icon: 'receipt' },
  { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Entertainment', color: '#eab308', icon: 'film' },
  { name: 'Health', color: '#ef4444', icon: 'heart-pulse' },
  { name: 'Travel', color: '#14b8a6', icon: 'plane' },
  { name: 'Other', color: '#64748b', icon: 'tag' },
];

export async function listByUser(userId) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM categories
      WHERE user_id = $1
      ORDER BY lower(name) ASC`,
    [userId],
  );
  return rows;
}

export async function findById(userId, id) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM categories WHERE user_id = $1 AND id = $2`,
    [userId, id],
  );
  return rows[0] || null;
}

export async function create(userId, { name, color = '#6366f1', icon = 'tag' }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO categories (user_id, name, color, icon)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [userId, name, color, icon],
  );
  return rows[0];
}

export async function createMany(userId, items, client) {
  const created = [];
  for (const item of items) {
    created.push(await create(userId, item, client));
  }
  return created;
}

export async function update(userId, id, fields) {
  const allowed = ['name', 'color', 'icon'];
  const sets = [];
  const values = [];
  let index = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${index}`);
      values.push(fields[key]);
      index += 1;
    }
  }

  if (sets.length === 0) return findById(userId, id);

  sets.push('updated_at = now()');
  values.push(userId, id);

  const { rows } = await query(
    `UPDATE categories SET ${sets.join(', ')}
      WHERE user_id = $${index} AND id = $${index + 1}
      RETURNING ${COLUMNS}`,
    values,
  );
  return rows[0] || null;
}

export async function remove(userId, id) {
  const { rowCount } = await query(
    'DELETE FROM categories WHERE user_id = $1 AND id = $2',
    [userId, id],
  );
  return rowCount > 0;
}
