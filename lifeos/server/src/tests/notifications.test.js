'use strict';

const request = require('supertest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('../services/notification.service');
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

const EMAIL = 'notify@example.com';
const PASSWORD = 'Password!234';

async function authedAgent() {
  await request(app).post('/api/v1/auth/register').send({ name: 'Notify User', email: EMAIL, password: PASSWORD });
  const res = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
  const at = (res.headers['set-cookie'] || []).find((c) => c.startsWith('lifeos_at='));
  const user = await User.findOne({ email: EMAIL });
  const userId = user._id.toString();

  await notificationService.create(userId, { title: 'First', body: 'First notification' });
  await notificationService.create(userId, { title: 'Second', body: 'Another one' });
  const deduped = await notificationService.create(userId, { title: 'Dedup', dedupeKey: `x:${userId}` });
  await notificationService.create(userId, { title: 'Dedup again', dedupeKey: `x:${userId}` });

  return { at, userId, dedupedTitle: deduped.title };
}

it('notifications: list, read one, read all', async () => {
  const { at, userId } = await authedAgent();

  // dedupeKey returns the existing document instead of creating a duplicate
  expect(await Notification.countDocuments({ userId })).toBe(3);

  const list = await request(app).get('/api/v1/notifications').set('Cookie', at);
  expect(list.status).toBe(200);
  expect(list.body.data.notifications).toHaveLength(3);

  const first = list.body.data.notifications[0];
  const read = await request(app).patch(`/api/v1/notifications/${first._id}/read`).set('Cookie', at);
  expect(read.status).toBe(200);
  expect(read.body.data.notification.readAt).toBeTruthy();

  const unreadList = await request(app).get('/api/v1/notifications?unread=true').set('Cookie', at);
  expect(unreadList.body.data.notifications).toHaveLength(2);

  const readAll = await request(app).post('/api/v1/notifications/read-all').set('Cookie', at);
  expect(readAll.status).toBe(200);
  expect(readAll.body.data.modified).toBe(2);

  const after = await request(app).get('/api/v1/notifications?unread=true').set('Cookie', at);
  expect(after.body.data.notifications).toHaveLength(0);
});

it('notifications: 401 without a session', async () => {
  const res = await request(app).get('/api/v1/notifications');
  expect(res.status).toBe(401);
});

it('health endpoint is public and reports ok', async () => {
  const res = await request(app).get('/api/v1/health');
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('ok');
});
