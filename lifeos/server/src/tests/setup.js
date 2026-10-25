'use strict';

process.env.NODE_ENV = 'test';
// PORT stays within the valid schema range; supertest binds an ephemeral port anyway.
process.env.PORT = '4001';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-0123456789-0123456789';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-0123456789-0123456789';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAMESITE = 'strict';
