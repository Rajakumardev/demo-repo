import * as userModel from '../models/user.model.js';
import * as categoryModel from '../models/category.model.js';
import * as refreshTokenModel from '../models/refreshToken.model.js';
import { withTransaction } from '../db/pool.js';
import { conflict, unauthorized } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  expiryFromToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from '../utils/cookies.js';

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Issue an access token, create a refresh session and set the refresh cookie.
 * Returns the access token for the JSON response body.
 */
async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  const expiresAt = expiryFromToken(refreshToken);

  await refreshTokenModel.store({
    jti,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  setRefreshCookie(res, refreshToken, expiresAt);
  return accessToken;
}

export async function register(req, res, next) {
  try {
    const { name, email, password, currency } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) throw conflict('An account with this email already exists');

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await withTransaction(async (client) => {
        const created = await userModel.create(
          { email, name, passwordHash, currency },
          client,
        );
        await categoryModel.createMany(created.id, categoryModel.DEFAULT_CATEGORIES, client);
        return created;
      });
    } catch (err) {
      if (err.code === '23505') {
        throw conflict('An account with this email already exists');
      }
      throw err;
    }

    const accessToken = await issueSession(res, user);
    return res.status(201).json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmailWithHash(email);
    if (!user) throw unauthorized('Invalid email or password');

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw unauthorized('Invalid email or password');

    const accessToken = await issueSession(res, user);
    return res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('Missing refresh token');

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw unauthorized('Invalid or expired refresh token');
    }

    const stored = await refreshTokenModel.findByHash(hashToken(token));

    // Unknown or already-revoked token: treat as replay and revoke the family.
    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
      await refreshTokenModel.revokeAllForUser(payload.sub);
      throw unauthorized('Refresh token is no longer valid');
    }

    const user = await userModel.findById(payload.sub);
    if (!user) throw unauthorized('Account no longer exists');

    // Rotate: revoke the presented token, then issue a fresh pair.
    await refreshTokenModel.revokeById(stored.id);
    const accessToken = await issueSession(res, user);

    return res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await refreshTokenModel.revokeByHash(hashToken(token));
    }
    clearRefreshCookie(res);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}
