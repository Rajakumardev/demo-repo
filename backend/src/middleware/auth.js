import * as userModel from '../models/user.model.js';
import { unauthorized } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Require a valid `Authorization: Bearer <access token>` header. On success the
 * authenticated user is attached to `req.user`.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized('Invalid or expired access token');
    }

    const user = await userModel.findById(payload.sub);
    if (!user) throw unauthorized('Account no longer exists');

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default requireAuth;
