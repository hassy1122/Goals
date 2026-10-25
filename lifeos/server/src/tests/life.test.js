'use strict';

const request = require('supertest');
const { startMongo, stopMongo, resetDb } = require('./mongo');

let app;
let at; // access-token cookie
let healthId;

beforeAll(async () => {
  app = await startMongo();
});
afterAll(async () => {
  await stopMongo();
});
beforeEach(async () => {
  await resetDb();

  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Demo User', email: 'demo@example.com', password: 'Password!234' });
  at = (reg.headers['set-cookie'] || []).find((c) => c.startsWith('lifeos_at=')).split(';')[0];

  const areas = await request(app).get('/api/v1/life-areas').set('Cookie', at);
  healthId = areas.body.data.areas.find((a) => a.key === 'health')._id;
});

const areaId = (key) =>
  request(app).get('/api/v1/life-areas').set('Cookie', at).then((res) =>
    res.body.data.areas.find((a) => a.key === key)._id);

describe('_life areas', () => {
  it('registers default areas with auto order and blended scores', async () => {
    const res = await request(app).get('/api/v1/life-areas').set('Cookie', at);
    expect(res.status).toBe(200);
    const areas = res.body.data.areas;
    expect(areas).toHaveLength(10);
    expect(areas[0].order).toBe(1);
    expect(areas[0].blendedScore).toBe(0);
  });

  it('creates an area with auto-slug; duplicates are 409', async () => {
    const res = await request(app).post('/api/v1/life-areas').set('Cookie', at)
      .send({ name: 'Side Quest World', icon: '🗺️' });
    expect(res.status).toBe(201);
    expect(res.body.data.area.key).toBe('side-quest-world');

    const dup = await request(app).post('/api/v1/life-areas').set('Cookie', at)
      .send({ name: 'side quest world' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_AREA');
  });

  it('reorders areas', async () => {
    const res0 = await request(app).get('/api/v1/life-areas').set('Cookie', at);
    const ids = res0.body.data.areas.map((a) => a._id).reverse();
    const res = await request(app).post('/api/v1/life-areas/reorder').set('Cookie', at)
      .send({ order: ids });
    expect(res.status).toBe(200);
    expect(res.body.data.areas[0]._id).toBe(ids[0]);
  });

  it('assessment updates currentScore and shortens the blend', async () => {
    const res = await request(app).post(`/api/v1/life-areas/${healthId}/assessments`).set('Cookie', at)
      .send({ score: 7, answers: [{ question: 'Sleep', value: 8 }], note: 'coming back' });
    expect(res.status).toBe(200);
    expect(res.body.data.area.currentScore).toBe(7);
    // blended = 0.6*7 + 0.4*0 = 4.2
    expect(res.body.data.area.blendedScore).toBe(4.2);

    const wheel = await request(app).get('/api/v1/life-areas/wheel').set('Cookie', at);
    const health = wheel.body.data.areas.find((a) => a._id === healthId);
    expect(health.assessmentCount).toBe(1);
    expect(health.latestAssessment.score).toBe(7);
  });

  it('blocks area deletion while goals reference it', async () => {
    await request(app).post('/api/v1/goals').set('Cookie', at)
      .send({ areaId: healthId, title: 'Sleep by 11pm', type: 'short' });
    const res = await request(app).delete(`/api/v1/life-areas/${healthId}`).set('Cookie', at);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AREA_IN_USE');
  });

  it('scopes areas to the owning user', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Other', email: 'other@example.com', password: 'Password!234' });
    const other = await request(app).post('/api/v1/auth/login')
      .send({ email: 'other@example.com', password: 'Password!234' });
    const otherAt = (other.headers['set-cookie'] || []).find((c) => c.startsWith('lifeos_at=')).split(';')[0];

    const res = await request(app).patch(`/api/v1/life-areas/${healthId}`).set('Cookie', otherAt)
      .send({ name: 'Hax' });
    expect(res.status).toBe(404);
  });
});

describe('vision', () => {
  it('auto-creates an empty vision, then patches sections', async () => {
    const res0 = await request(app).get('/api/v1/vision').set('Cookie', at);
    expect(res0.status).toBe(200);
    expect(res0.body.data.vision.statement).toBe('');

    const res = await request(app).patch('/api/v1/vision').set('Cookie', at)
      .send({
        statement: 'Calm, competent, curious.',
        coreValues: ['Calm', 'Craft'],
        roadmap: [{ horizon: 1, title: 'Run 10k' }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.vision.statement).toBe('Calm, competent, curious.');
    expect(res.body.data.vision.coreValues).toEqual(['Calm', 'Craft']);

    const reject = await request(app).patch('/api/v1/vision').set('Cookie', at)
      .send({ statement: 'x', rogueField: true });
    expect(reject.status).toBe(422);
  });
});

describe('decisions', () => {
  it('creates, decides, filters and deletes', async () => {
    const create = await request(app).post('/api/v1/decisions').set('Cookie', at)
      .send({
        title: 'City vs suburbs',
        options: [
          { title: 'City', pros: ['commute'], cons: ['rent'] },
          { title: 'Suburbs', pros: ['space'] },
        ],
      });
    expect(create.status).toBe(201);
    const id = create.body.data.decision._id;
    expect(create.body.data.decision.status).toBe('open');

    const decide = await request(app).patch(`/api/v1/decisions/${id}`).set('Cookie', at)
      .send({ status: 'decided', chosenOptionIndex: 1 });
    expect(decide.status).toBe(200);
    expect(decide.body.data.decision.decidedAt).toBeTruthy();

    const outOfRange = await request(app).patch(`/api/v1/decisions/${id}`).set('Cookie', at)
      .send({ chosenOptionIndex: 9 });
    expect(outOfRange.status).toBe(422); // zod caps the index at 7 before the service check

    const open = await request(app).post('/api/v1/decisions').set('Cookie', at)
      .send({ title: 'Rent or buy tools' });
    const list = await request(app).get('/api/v1/decisions?status=open').set('Cookie', at);
    expect(list.body.data.decisions).toHaveLength(1);
    expect(list.body.data.decisions[0]._id).toBe(open.body.data.decision._id);

    const del = await request(app).delete(`/api/v1/decisions/${id}`).set('Cookie', at);
    expect(del.status).toBe(200);
  });
});

describe('onboarding completion', () => {
  it('sets area targets, vision statement, first goal, and user.onboarding.done', async () => {
    const res = await request(app).post('/api/v1/auth/me/onboarding/complete').set('Cookie', at)
      .send({
        areas: [{ areaId: healthId, targetScore: 8 }],
        statement: 'Strong and calm in 2026.',
        coreValues: ['Strength'],
        firstGoal: { areaId: healthId, title: 'Three workouts a week for a month' },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.areasUpdated).toBe(1);
    expect(res.body.data.goal.title).toBe('Three workouts a week for a month');
    expect(res.body.data.goal.status).toBe('active');

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', at);
    expect(me.body.data.user.onboarding.done).toBe(true);

    const vision = await request(app).get('/api/v1/vision').set('Cookie', at);
    expect(vision.body.data.vision.statement).toBe('Strong and calm in 2026.');
  });
});
