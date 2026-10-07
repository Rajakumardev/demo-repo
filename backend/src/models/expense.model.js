import { query } from '../db/pool.js';

const COLUMNS = `e.id,
  e.user_id,
  e.category_id,
  e.amount,
  e.description,
  e.spent_at,
  e.created_at,
  e.updated_at,
  c.name  AS category_name,
  c.color AS category_color,
  c.icon  AS category_icon`;

const SORTS = {
  date_desc: 'e.spent_at DESC',
  date_asc: 'e.spent_at ASC',
  amount_desc: 'e.amount DESC',
  amount_asc: 'e.amount ASC',
};

function buildFilters(userId, { from, to, categoryId, search } = {}) {
  const where = ['e.user_id = $1'];
  const params = [userId];

  if (from) {
    params.push(from);
    where.push(`e.spent_at >= $${params.length}::date`);
  }
  if (to) {
    // `to` is inclusive: everything strictly before the following day.
    params.push(to);
    where.push(`e.spent_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (categoryId) {
    params.push(categoryId);
    where.push(`e.category_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`e.description ILIKE $${params.length}`);
  }

  return { where: where.join(' AND '), params };
}

export async function listByUser(userId, filters = {}) {
  const { where, params } = buildFilters(userId, filters);
  const order = SORTS[filters.sort] || SORTS.date_desc;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${COLUMNS}
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE ${where}
      ORDER BY ${order}, e.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

export async function countByUser(userId, filters = {}) {
  const { where, params } = buildFilters(userId, filters);
  const { rows } = await query(
    `SELECT count(*)::int AS total, COALESCE(SUM(e.amount), 0) AS amount
       FROM expenses e
      WHERE ${where}`,
    params,
  );
  return rows[0];
}

export async function findById(userId, id) {
  const { rows } = await query(
    `SELECT ${COLUMNS}
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = $1 AND e.id = $2`,
    [userId, id],
  );
  return rows[0] || null;
}

export async function create(userId, { amount, description = '', spentAt, categoryId }) {
  const { rows } = await query(
    `INSERT INTO expenses (user_id, amount, description, spent_at, category_id)
     VALUES ($1, $2, $3, COALESCE($4, now()), $5)
     RETURNING id`,
    [userId, amount, description, spentAt ?? null, categoryId ?? null],
  );
  return findById(userId, rows[0].id);
}

export async function update(userId, id, fields) {
  const mapping = {
    amount: 'amount',
    description: 'description',
    spentAt: 'spent_at',
    categoryId: 'category_id',
  };
  const sets = [];
  const values = [];
  let index = 1;

  for (const [key, column] of Object.entries(mapping)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = $${index}`);
      values.push(fields[key]);
      index += 1;
    }
  }

  if (sets.length === 0) return findById(userId, id);

  sets.push('updated_at = now()');
  values.push(userId, id);

  const { rows } = await query(
    `UPDATE expenses SET ${sets.join(', ')}
      WHERE user_id = $${index} AND id = $${index + 1}
      RETURNING id`,
    values,
  );
  if (!rows[0]) return null;
  return findById(userId, id);
}

export async function remove(userId, id) {
  const { rowCount } = await query(
    'DELETE FROM expenses WHERE user_id = $1 AND id = $2',
    [userId, id],
  );
  return rowCount > 0;
}

/** Aggregated totals, per-category and per-month breakdowns. */
export async function summary(userId, { from, to } = {}) {
  const { where, params } = buildFilters(userId, { from, to });

  const [totals, byCategory, byMonth] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(e.amount), 0) AS total,
              count(*)::int            AS count,
              COALESCE(AVG(e.amount), 0) AS average,
              COALESCE(MAX(e.amount), 0) AS largest
         FROM expenses e
        WHERE ${where}`,
      params,
    ),
    query(
      `SELECT c.id,
              COALESCE(c.name, 'Uncategorised') AS name,
              COALESCE(c.color, '#94a3b8')      AS color,
              COALESCE(SUM(e.amount), 0)        AS total,
              count(*)::int                     AS count
         FROM expenses e
         LEFT JOIN categories c ON c.id = e.category_id
        WHERE ${where}
        GROUP BY c.id, c.name, c.color
        ORDER BY total DESC`,
      params,
    ),
    query(
      `SELECT to_char(date_trunc('month', e.spent_at), 'YYYY-MM') AS month,
              COALESCE(SUM(e.amount), 0) AS total,
              count(*)::int              AS count
         FROM expenses e
        WHERE ${where}
        GROUP BY 1
        ORDER BY 1 ASC`,
      params,
    ),
  ]);

  return {
    totals: totals.rows[0],
    byCategory: byCategory.rows,
    byMonth: byMonth.rows,
  };
}
