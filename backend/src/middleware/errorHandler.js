import { AppError } from '../utils/errors.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

/**
 * Centralised error handler. Known `AppError`s expose their message and
 * details; anything else is logged and reported as a generic 500.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Body parser failures (malformed JSON) surface as SyntaxError with a status.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }

  const status = err instanceof AppError ? err.status : err.status || 500;
  const expose = err instanceof AppError || err.expose === true;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(status).json({
    error: {
      message: expose ? err.message : 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
