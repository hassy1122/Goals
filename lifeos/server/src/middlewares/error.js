'use strict';

const { AppError } = require('../utils/apiError');

function mapError(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err && err.name === 'ZodError') {
    return {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed.',
      details: err.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
    };
  }
  if (err && err.name === 'ValidationError') {
    return { status: 400, code: 'VALIDATION_ERROR', message: err.message };
  }
  if (err && err.name === 'CastError') {
    return { status: 400, code: 'INVALID_ID', message: 'Invalid identifier.' };
  }
  if (err && err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    return { status: 409, code: 'DUPLICATE', message: field ? `Duplicate value for ${field}.` : 'Duplicate value.' };
  }
  if (err && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
    return {
      status: 401,
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: 'Invalid session token.',
    };
  }
  if (err && err.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Malformed JSON body.' };
  }
  if (err && err.name === 'MulterError') {
    const multerMap = {
      LIMIT_FILE_SIZE: { status: 413, code: 'FILE_TOO_LARGE', message: 'File exceeds the 5 MB limit.' },
      LIMIT_FILE_COUNT: { status: 400, code: 'TOO_MANY_FILES', message: 'One file per request.' },
      LIMIT_UNEXPECTED_FILE: { status: 400, code: 'UNEXPECTED_FILE', message: 'Attach the file in the "file" field.' },
    };
    return multerMap[err.code] || { status: 400, code: 'UPLOAD_ERROR', message: 'Upload failed.' };
  }
  return null;
}

function notFound(req, res, next) {
  return next(new AppError(404, 'ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const mapped = mapError(err);
  if (!mapped) console.error('[error]', err);

  const status = mapped?.status ?? 500;
  const code = mapped?.code ?? 'INTERNAL_ERROR';
  const message = mapped?.message ?? 'Something went wrong.';

  return res.status(status).json({ success: false, error: { code, message, details: mapped?.details } });
}

module.exports = { notFound, errorHandler };
