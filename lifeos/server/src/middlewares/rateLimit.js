'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function createRateLimiters() {
  const shared = {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Rate limiting stays off while running the test suite.
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down and try again shortly.' },
      }),
  };

  return {
    apiLimiter: rateLimit({ ...shared, limit: env.RATE_LIMIT_API_MAX }),
    authLimiter: rateLimit({ ...shared, limit: env.RATE_LIMIT_AUTH_MAX, skipSuccessfulRequests: false }),
  };
}

module.exports = { createRateLimiters };
