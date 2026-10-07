import { badRequest } from '../utils/errors.js';

/**
 * Build a middleware that validates `req[source]` against a zod schema and
 * replaces it with the parsed (and coerced) value on success.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(badRequest('Validation failed', result.error.flatten().fieldErrors));
  }
  req[source] = result.data;
  return next();
};

export default validate;
