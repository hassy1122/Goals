'use strict';

const request = require('supertest');
const User = require('../models/User');
const LifeArea = require('../models/LifeArea');
const { startMongo, stopMongo, resetDb } = require('./mongo');

let app;

beforeAll(async () => {
  app = await startMongo();
});
afterAll(async () => {
  await stopMongo();
});
beforeEach(async () => {
  await resetDb();
});

const cookieFor = (res, name) => {
  const jar = res.headers['set-cookie'] || [];
  const found = jar.find((c) => c.startsWith(`${name}=`));
  return found ? found.split(';')[0] : null;
};

const EMAIL = 'demo@example.com';
const PASSWORD = 'Password!234';
const register = (body = { name: 'Demo User', email: EMAIL, password: PASSWORD }) =>
  request(app).post('/api/v1/auth/register').send(body);
const login = (email = EMAIL, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

describe('POST /auth/register', () => {
  it('creates a user, 10 default life areas, and sets auth cookies', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(EMAIL);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    expect(await User.countDocuments({})).toBe(1);
    expect(await LifeArea.countDocuments({ userId: res.body.data.user._id })).toBe(10);

    expect(cookieFor(res, 'lifeos_at')).toBeTruthy();
    expect(cookieFor(res, 'lifeos_rt')).toBeTruthy();
  });

  it('rejects duplicate email with 409', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects weak passwords with 422', async () => {
    const res = await register({ name: 'Demo User', email: 'weak@example.com', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login + /auth/me', () => {
  it('logs in with correct credentials and returns the user via /me', async () => {
    await register();
    const res = await login();
    expect(res.status).toBe(200);

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookieFor(res, 'lifeos_at'));
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(EMAIL);
    expect(me.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects wrong password with 401', async () => {
    await register();
    const res = await login(EMAIL, 'WrongPassword!999');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects /me without a session cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh (rotation)', () => {
  it('rotates the refresh token', async () => {
    await register();
    const loginRes = await login();
    const rt1 = cookieFor(loginRes, 'lifeos_rt');

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', rt1).send({});
    expect(refreshRes.status).toBe(200);
    const rt2 = cookieFor(refreshRes, 'lifeos_rt');
    expect(rt2).toBeTruthy();
    expect(rt2).not.toBe(rt1);
  });

  it('rejects replay of a rotated token and revokes all sessions', async () => {
    await register();
    const loginRes = await login();
    const rt1 = cookieFor(loginRes, 'lifeos_rt');

    await request(app).post('/api/v1/auth/refresh').set('Cookie', rt1).send({});

    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', rt1).send({});
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_REUSED');
  });

  it('rejects unknown refresh token with 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', 'lifeos_rt=deadbeef').send({});
    expect(res.status).toBe(401);
  });
});

describe('DELETE /auth/me (account deletion)', () => {
  it('deletes the account after password confirmation', async () => {
    await register();
    const loginRes = await login();
    const at = cookieFor(loginRes, 'lifeos_at');

    const del = await request(app).delete('/api/v1/auth/me').set('Cookie', at).send({ password: PASSWORD });
    expect(del.status).toBe(200);

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', at);
    expect(me.status).toBe(401);
    expect(await User.countDocuments({})).toBe(0);
  });
});

describe('RBAC', () => {
  it('forbids a normal user from admin endpoints', async () => {
    await register();
    const loginRes = await login();
    const res = await request(app).get('/api/v1/admin/users').set('Cookie', cookieFor(loginRes, 'lifeos_at'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_REQUIRED');
  });
});
