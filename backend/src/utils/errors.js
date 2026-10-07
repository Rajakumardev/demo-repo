/**
 * Application level error with an HTTP status code and optional structured
 * details. Errors of this class are considered "exposed" and their message is
 * safe to return to the client.
 */
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const badRequest = (message = 'Bad request', details) =>
  new AppError(400, message, details);

export const unauthorized = (message = 'Unauthorized') => new AppError(401, message);

export const forbidden = (message = 'Forbidden') => new AppError(403, message);

export const notFound = (message = 'Not found') => new AppError(404, message);

export const conflict = (message = 'Conflict', details) =>
  new AppError(409, message, details);
