import { badRequest } from '../utils/errors.js';

/**
 * Build a middleware that validates `req[source]` against a zod schema and
 * replaces it with the parsed (and coerced) value on success.
 *
 * `defineProperty` is used because Express exposes `req.query` through a
 * getter-only accessor in strict mode.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(badRequest('Validation failed', result.error.flatten().fieldErrors));
  }
  Object.defineProperty(req, source, {
    value: result.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return next();
};

export default validate;
