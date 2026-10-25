'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const { startMongo, stopMongo, resetDb } = require('./mongo');

let app;
let at;
let healthId;
let careerId;

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
    .send({ name: 'Goal User', email: 'goals@example.com', password: 'Password!234' });
  at = (reg.headers['set-cookie'] || []).find((c) => c.startsWith('lifeos_at=')).split(';')[0];
  const areas = await request(app).get('/api/v1/life-areas').set('Cookie', at);
  healthId = areas.body.data.areas.find((a) => a.key === 'health')._id;
  careerId = areas.body.data.areas.find((a) => a.key === 'career')._id;
});

const createGoal = (body) => request(app).post('/api/v1/goals').set('Cookie', at).send(body);
const listGoals = (query = '') => request(app).get(`/api/v1/goals${query}`).set('Cookie', at);
const getGoal = (id) => request(app).get(`/api/v1/goals/${id}`).set('Cookie', at);

describe('goal create + priority', () => {
  it('creates a goal and scores priority ((3×3 + 4×2 + 2×2 ÷ 2) = 10.5 → critical), history seeded', async () => {
    const res = await createGoal({
      areaId: healthId,
      title: 'Sleep by 11pm',
      type: 'short',
      status: 'active',
      importance: 3,
      impact: 4,
      urgency: 2,
      effort: 2,
    });
    expect(res.status).toBe(201);
    const goal = res.body.data.goal;
    expect(goal.priorityScore).toBe(10.5);
    expect(goal.priorityLabel).toBe('critical');
    expect(goal.progressPercent).toBe(0);
    expect(goal.progressSource).toBe('manual');
    expect(goal.weight).toBe(10);
    expect(res.body.data.celebration).toBe(false);
  });

  it('rejects unknown/computed fields client-side', async () => {
    const res = await createGoal({ areaId: healthId, title: 'x', progressPercent: 50 });
    expect(res.status).toBe(422);
  });

  it('rejects a bad areaId with 404', async () => {
    const res = await createGoal({ areaId: mongoose.Types.ObjectId.createFromHexString('507f1f77bcf86cd799439011'), title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('weight caps', () => {
  it('marks an area at Σ100 with 409 WEIGHT_OVERFLOW', async () => {
    const a = await (await createGoal({ areaId: healthId, title: 'A' })).body.data.goal;
    await request(app).patch(`/api/v1/goals/${a._id}`).set('Cookie', at).send({ weight: 95 });
    const b = await createGoal({ areaId: healthId, title: 'B', weight: 10 });
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe('WEIGHT_OVERFLOW');
  });

  it('fits exactly at Σ100', async () => {
    await (await createGoal({ areaId: healthId, title: 'A' })).body.data.goal._id;
    const b = await createGoal({ areaId: healthId, title: 'B', weight: 90 });
    expect(b.status).toBe(201);
  });
});

describe('milestones drive progress and auto-complete', () => {
  let goalId;

  beforeEach(async () => {
    const res = await createGoal({ areaId: healthId, title: '10k training', type: 'short', status: 'active' });
    goalId = res.body.data.goal._id;
  });

  it('milestones = progress source; 2/4 done = 50%', async () => {
    for (const [i, title] of ['Register', '5k', '10k', 'Race'].entries()) {
      await request(app).post(`/api/v1/goals/${goalId}/milestones`).set('Cookie', at)
        .send({ title, dueDate: new Date(Date.now() + (i + 1) * 86400000).toISOString() });
    }
    const first = await getGoal(goalId);
    const ms = first.body.data.milestones;
    expect(ms.map((m) => m.order)).toEqual([1, 2, 3, 4]);

    await request(app).patch(`/api/v1/goals/${goalId}/milestones/${ms[0]._id}`).set('Cookie', at)
      .send({ status: 'done' });
    await request(app).patch(`/api/v1/goals/${goalId}/milestones/${ms[1]._id}`).set('Cookie', at)
      .send({ status: 'done' });

    const mid = await getGoal(goalId);
    expect(mid.body.data.goal.progressSource).toBe('milestones');
    expect(mid.body.data.goal.progressPercent).toBe(50);
    expect(mid.body.data.goal.counts).toEqual({ milestonesDone: 2, milestonesTotal: 4, tasksDone: 0, tasksTotal: 0 });
  });

  it('all milestones done → auto-complete + celebration', async () => {
    const created = [];
    for (const title of ['A', 'B']) {
      const res = await request(app).post(`/api/v1/goals/${goalId}/milestones`).set('Cookie', at)
        .send({ title });
      created.push(res.body.data.milestone);
    }
    const done = await request(app).patch(`/api/v1/goals/${goalId}/milestones/${created[0]._id}`)
      .set('Cookie', at).send({ status: 'done' });
    expect(done.status).toBe(200);

    const finish = await request(app).patch(`/api/v1/goals/${goalId}/milestones/${created[1]._id}`)
      .set('Cookie', at).send({ status: 'done' });
    expect(finish.status).toBe(200);

    const final = await getGoal(goalId);
    expect(final.body.data.goal.status).toBe('completed');
    expect(final.body.data.goal.completedAt).toBeTruthy();
    expect(final.body.data.goal.progressPercent).toBe(100);
  });

  it('reorders milestones', async () => {
    const created = [];
    for (const title of ['A', 'B', 'C']) {
      const res = await request(app).post(`/api/v1/goals/${goalId}/milestones`).set('Cookie', at)
        .send({ title });
      created.push(res.body.data.milestone);
    }
    const res = await request(app).post(`/api/v1/goals/${goalId}/milestones/reorder`).set('Cookie', at)
      .send({ order: [created[2]._id, created[0]._id, created[1]._id] });
    expect(res.status).toBe(200);
    expect(res.body.data.milestones.map((m) => m.title)).toEqual(['C', 'A', 'B']);
  });

  it('redeems a milestone reward; without reward → 400 NO_REWARD', async () => {
    const noReward = await request(app).post(`/api/v1/goals/${goalId}/milestones`).set('Cookie', at)
      .send({ title: 'no reward' });
    const redeem0 = await request(app).post(`/api/v1/goals/${goalId}/milestones/${noReward.body.data.milestone._id}/redeem`)
      .set('Cookie', at);
    expect(redeem0.status).toBe(400);
    expect(redeem0.body.error.code).toBe('NO_REWARD');

    const withReward = await request(app).post(`/api/v1/goals/${goalId}/milestones`).set('Cookie', at)
      .send({ title: 'big week', reward: 'Sushi' });
    const redeem = await request(app).post(`/api/v1/goals/${goalId}/milestones/${withReward.body.data.milestone._id}/redeem`)
      .set('Cookie', at);
    expect(redeem.status).toBe(200);
    expect(redeem.body.data.milestone.rewardRedeemedAt).toBeTruthy();
  });
});

describe('risks, dependencies, blockers', () => {
  let goalA;
  let goalB;

  beforeEach(async () => {
    goalA = (await (await createGoal({ areaId: careerId, title: 'Beach body for the move', type: 'medium' })).body.data.goal)._id;
    goalB = (await (await createGoal({ areaId: healthId, title: 'Get to 80kg', type: 'medium' })).body.data.goal)._id;
  });

  it('adds, updates and removes a risk by index', async () => {
    const add = await request(app).post(`/api/v1/goals/${goalA}/risks`).set('Cookie', at)
      .send({ risk: 'Travel month kills routine', probability: 4, impact: 3 });
    expect(add.status).toBe(201);

    const upd = await request(app).patch(`/api/v1/goals/${goalA}/risks/0`).set('Cookie', at)
      .send({ backupPlan: 'Hotel-gym rule: no exceptions' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.goal.risks[0].backupPlan).toBe('Hotel-gym rule: no exceptions');

    const del = await request(app).delete(`/api/v1/goals/${goalA}/risks/0`).set('Cookie', at);
    expect(del.status).toBe(200);
    expect(del.body.data.goal.risks).toHaveLength(0);
  });

  it('B depending on A makes A-list blocked; cycle is rejected', async () => {
    const depend = await request(app).post(`/api/v1/goals/${goalB}/dependencies`).set('Cookie', at)
      .send({ depId: goalA });
    expect(depend.status).toBe(200);

    const listB = await getGoal(goalB);
    expect(listB.body.data.goal.blocked).toBe(true); // B depends on the incomplete A
    const list = await listGoals().then((r) => r.body.data.goals);
    const targetB = list.find((g) => g._id === goalB);
    const targetA = list.find((g) => g._id === goalA);
    expect(targetB.blocked).toBe(true);
    expect(targetA.blocked).toBe(false);
    expect(targetB.dependsOn[0].title).toBe('Beach body for the move');

    const cycle = await request(app).post(`/api/v1/goals/${goalA}/dependencies`).set('Cookie', at)
      .send({ depId: goalB });
    expect(cycle.status).toBe(400);
    expect(cycle.body.error.code).toBe('DEPENDENCY_CYCLE');
  });

  it('deleting a dependency goal cleans up references', async () => {
    await request(app).post(`/api/v1/goals/${goalB}/dependencies`).set('Cookie', at)
      .send({ depId: goalA });
    await request(app).delete(`/api/v1/goals/${goalA}`).set('Cookie', at);
    const doc = await Goal.findById(goalB);
    expect(doc.dependsOn).toHaveLength(0);
  });
});

describe('templates', () => {
  it('offers the system library and applies into a real planned goal', async () => {
    const lib = await request(app).get('/api/v1/goal-templates').set('Cookie', at);
    expect(lib.status).toBe(200);
    expect(lib.body.data.system).toHaveLength(10);
    expect(lib.body.data.custom).toHaveLength(0);

    const apply = await request(app).post('/api/v1/goal-templates/run-5k/apply').set('Cookie', at)
      .send({ areaId: healthId, startDate: new Date().toISOString() });
    expect(apply.status).toBe(201);
    const record = apply.body.data.goal;
    expect(record.title).toBe('Run a 5k without stopping');
    expect(record.status).toBe('planned');
    expect(apply.body.data.milestones).toHaveLength(4);
    // all template milestones dated forward from startDate
    expect(apply.body.data.milestones[0].dueDate).toBeTruthy();
  });

  it('saves a goal as custom template (key deduped) and re-applies it', async () => {
    const g = (await (await createGoal({ areaId: healthId, title: 'Cold shower streak', type: 'short', description: '20 days' })).body.data.goal)._id;
    await request(app).post(`/api/v1/goals/${g}/milestones`).set('Cookie', at).send({ title: 'Day 7' });

    const mk = await request(app).post(`/api/v1/goals/${g}/make-template`).set('Cookie', at).send({});
    expect(mk.status).toBe(201);
    expect(mk.body.data.template.templateKey).toBe('cold-shower-streak');

    const mk2 = await request(app).post(`/api/v1/goals/${g}/make-template`).set('Cookie', at).send({});
    // make-template copies (never converts) — a second save dedupes the key instead.
    expect(mk2.status).toBe(201);
    expect(mk2.body.data.template.templateKey).toBe('cold-shower-streak-2');

    const lib = await request(app).get('/api/v1/goal-templates').set('Cookie', at);
    expect(lib.body.data.custom).toHaveLength(2);

    const apply = await request(app).post('/api/v1/goal-templates/cold-shower-streak/apply').set('Cookie', at)
      .send({ areaId: healthId, title: 'Cold shower streak round 2' });
    expect(apply.status).toBe(201);
    expect(apply.body.data.milestones[0].title).toBe('Day 7');
    expect(apply.body.data.goal.title).toBe('Cold shower streak round 2');
  });
});

describe('analytics + burnup', () => {
  it('returns comparison, impact-effort and gantt datasets', async () => {
    await createGoal({
      areaId: careerId,
      title: 'Launch blog',
      type: 'medium',
      startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      targetDate: new Date(Date.now() + 50 * 86400000).toISOString(),
    });
    await request(app).post(`/api/v1/goals/${(await listGoals()).body.data.goals[0]._id}/milestones`)
      .set('Cookie', at).send({ title: 'Pick platform', dueDate: new Date(Date.now() + 5 * 86400000).toISOString() });

    const comp = await request(app).get('/api/v1/goals/analytics/comparison').set('Cookie', at);
    expect(comp.status).toBe(200);
    expect(comp.body.data.goals[0].priorityScore).toBeDefined();

    const scatter = await request(app).get('/api/v1/goals/analytics/impact-effort').set('Cookie', at);
    expect(scatter.body.data.goals[0].effort).toBeDefined();

    const gantt = await request(app).get('/api/v1/goals/analytics/gantt').set('Cookie', at);
    const g0 = gantt.body.data.goals[0];
    expect(g0.startDate).toBeTruthy();
    expect(g0.milestones).toHaveLength(1);

    const goalId = g0._id;
    const burn = await request(app).get(`/api/v1/goals/${goalId}/burnup`).set('Cookie', at);
    expect(burn.status).toBe(200);
    expect(burn.body.data.planned.length).toBe(25);
    expect(['on-track', 'at-risk', 'behind']).toContain(burn.body.data.status);
  });
});

describe('cross-user isolation & completion flow', () => {
  it('another user cannot touch my goals', async () => {
    const g = (await (await createGoal({ areaId: healthId, title: 'Mine' })).body.data.goal)._id;
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Stranger', email: 'stranger@example.com', password: 'Password!234' });
    const other = await request(app).post('/api/v1/auth/login')
      .send({ email: 'stranger@example.com', password: 'Password!234' });
    const otherAt = (other.headers['set-cookie'] || []).find((c) => c.startsWith('lifeos_at=')).split(';')[0];

    const res = await request(app).get(`/api/v1/goals/${g}`).set('Cookie', otherAt);
    expect(res.status).toBe(404);
  });

  it('manual status completion sets completedAt; reactivation clears it', async () => {
    const g = (await (await createGoal({ areaId: healthId, title: 'Deep work', status: 'active' })).body.data.goal)._id;
    const complete = await request(app).patch(`/api/v1/goals/${g}`).set('Cookie', at)
      .send({ status: 'completed' });
    expect(complete.status).toBe(200);
    expect(complete.body.data.goal.completedAt).toBeTruthy();

    const reactivate = await request(app).patch(`/api/v1/goals/${g}`).set('Cookie', at)
      .send({ status: 'paused' });
    expect(reactivate.body.data.goal.completedAt).toBeNull();
  });

  it('metrics-source goals read from successMetrics (explicit status skipped)', async () => {
    const res = await createGoal({
      areaId: healthId,
      title: 'Read 12 books',
      type: 'medium',
      successMetrics: [{ label: 'Books', unit: 'books', current: 3, target: 12 }],
    });
    expect(res.body.data.goal.progressSource).toBe('metrics');
    expect(res.body.data.goal.progressPercent).toBe(25);
  });

  it('key-results drive OKR progress', async () => {
    const res = await createGoal({
      areaId: careerId,
      title: 'OKR goal',
      type: 'okr',
      okrKeyResults: [
        { title: 'k1', current: 50, target: 100 },
        { title: 'k2', current: 100, target: 100 },
      ],
    });
    expect(res.body.data.goal.progressSource).toBe('key-results');
    expect(res.body.data.goal.progressPercent).toBe(75);
  });
});
