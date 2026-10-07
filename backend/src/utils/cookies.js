import env, { isProduction } from '../config/env.js';

export const REFRESH_COOKIE = 'refresh_token';

// The refresh cookie is only sent to the auth endpoints, limiting its exposure.
const REFRESH_COOKIE_PATH = '/api/auth';

const baseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
  domain: env.COOKIE_DOMAIN || undefined,
};

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions, expires: expiresAt });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}
