import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const ISSUER = 'expense-manager';
const ACCESS = 'access';
const REFRESH = 'refresh';

/** Sign a short-lived access token for the given user. */
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, type: ACCESS }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: ISSUER,
  });
}

/**
 * Sign a long-lived refresh token. The `jti` is stored alongside a hash of the
 * token so individual sessions can be revoked and rotated.
 */
export function signRefreshToken(user, jti = crypto.randomUUID()) {
  const token = jwt.sign({ sub: user.id, jti, type: REFRESH }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: ISSUER,
  });
  return { token, jti };
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER });
  if (payload.type !== ACCESS) throw new Error('Unexpected token type');
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER });
  if (payload.type !== REFRESH) throw new Error('Unexpected token type');
  return payload;
}

/** Deterministic SHA-256 hash used to store refresh tokens at rest. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Extract the expiry timestamp encoded in a JWT. */
export function expiryFromToken(token) {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded.exp !== 'number') {
    throw new Error('Token has no expiry claim');
  }
  return new Date(decoded.exp * 1000);
}
