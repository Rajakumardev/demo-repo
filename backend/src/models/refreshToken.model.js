import { query } from '../db/pool.js';

/** Persist a refresh token session. `id` is the token's `jti`. */
export async function store({ jti, userId, tokenHash, expiresAt, client }) {
  const run = client ? client.query.bind(client) : query;
  await run(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [jti, userId, tokenHash, expiresAt],
  );
}

export async function findByHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  return rows[0] || null;
}

export async function revokeByHash(tokenHash) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function revokeById(id) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE id = $1 AND revoked_at IS NULL`,
    [id],
  );
}

/** Revoke every active session for a user (used on replay detection / logout-all). */
export async function revokeAllForUser(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

/** Housekeeping: drop tokens that have expired or been revoked. */
export async function deleteExpired() {
  await query(
    `DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at IS NOT NULL`,
  );
}
