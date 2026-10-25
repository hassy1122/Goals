'use strict';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const badRequest = (message = 'Bad request.', code = 'BAD_REQUEST', details) =>
  new AppError(400, code, message, details);
const unauthorized = (message = 'Authentication required.', code = 'AUTH_REQUIRED', details) =>
  new AppError(401, code, message, details);
const forbidden = (message = 'Not allowed.', code = 'FORBIDDEN', details) =>
  new AppError(403, code, message, details);
const notFound = (message = 'Not found.', code = 'NOT_FOUND', details) =>
  new AppError(404, code, message, details);
const conflict = (message = 'Conflict.', code = 'CONFLICT', details) =>
  new AppError(409, code, message, details);
const unprocessable = (message = 'Validation failed.', code = 'VALIDATION_ERROR', details) =>
  new AppError(422, code, message, details);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, unprocessable };
