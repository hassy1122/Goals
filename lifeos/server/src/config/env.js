'use strict';

const { z } = require('zod');

const DEV_ACCESS_SECRET = 'dev-insecure-access-secret-change-me-0123456789abcdef';
const DEV_REFRESH_SECRET = 'dev-insecure-refresh-secret-change-me-0123456789abcdef';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/lifeos'),
  JWT_ACCESS_SECRET: z.string().min(32).default(DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().min(32).default(DEV_REFRESH_SECRET),
  JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/, 'Use forms like 15m, 1h, 7d').default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('LifeOS <no-reply@lifeos.local>'),
  INITIAL_ADMIN_EMAIL: z.string().default(''),
  INITIAL_ADMIN_PASSWORD: z.string().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(5),
  // Private single-account mode (set in .env):
  //   OWNER_EMAIL       — the one account that may sign in; other credentials are rejected
  //   OWNER_NAME        — display name used when the seed provisions the account
  //   OWNER_PASSWORD    — password used by the seed when it creates the account
  // When OWNER_EMAIL is empty (tests / dev defaults) no restriction is applied.
  OWNER_EMAIL: z.string().default(''),
  OWNER_NAME: z.string().default(''),
  OWNER_PASSWORD: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
  console.error(`[env] Invalid environment variables:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const securityProblems = [
    env.JWT_ACCESS_SECRET.startsWith('dev-insecure-') && 'JWT_ACCESS_SECRET must not use the dev default.',
    env.JWT_REFRESH_SECRET.startsWith('dev-insecure-') && 'JWT_REFRESH_SECRET must not use the dev default.',
    env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE && 'COOKIE_SAMESITE=none requires COOKIE_SECURE=true.',
    env.CLIENT_URL.startsWith('http://') && 'CLIENT_URL must be https in production.',
  ].filter(Boolean);
  if (securityProblems.length > 0) {
    console.error(`[env] Production security problems:\n${securityProblems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(1);
  }
}

module.exports = Object.freeze(env);
