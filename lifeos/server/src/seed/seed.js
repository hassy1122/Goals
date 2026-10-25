'use strict';

// Demo seed: `npm run seed` — idempotent (users are upserted by email,
// Phase 2 demo content is only created while the user has no goals).
require('dotenv').config();

const env = require('../config/env');
const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const LifeArea = require('../models/LifeArea');
const Vision = require('../models/Vision');
const Assessment = require('../models/Assessment');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const userService = require('../services/user.service');
const lifeService = require('../services/life.service');
const goalService = require('../services/goal.service');
const { hashPassword } = require('../utils/crypto');

const DEMO = { email: 'demo@lifeos.app', name: 'Demo Planner', password: 'ChangeMe!2026' };
const DAY = 86400000;

async function upsertUser({ email, name, password, role = 'user' }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name, role, passwordHash: await hashPassword(password) });
    await userService.createDefaultAreas(user._id);
    console.log(`[seed] created ${role}: ${email}`);
  } else {
    if (role === 'admin' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log(`[seed] promoted existing user to admin: ${email}`);
    } else {
      console.log(`[seed] already exists: ${email}`);
    }
  }
  return user;
}

// ---- Phase 2 demo data: vision + assessments + 3 goals ----
// Built through the real services, so priority scores, progress percentages,
// area goal scores and history entries end up exactly like production data.
async function ensurePhase2Demo(userId) {
  const existing = await Goal.exists({ userId });
  if (existing) return;

  const areas = await LifeArea.find({ userId }).lean();
  const byKey = new Map(areas.map((a) => [a.key, a]));
  const areaId = (key) => {
    const area = byKey.get(key);
    if (!area) throw new Error(`[seed] default area "${key}" missing — re-run the seed`);
    return area._id;
  };

  // --- Vision ---
  await lifeService.visionUpdate(userId, {
    statement:
      'I am building a deliberate life: strong enough to say yes to adventures, calm enough to enjoy them, and skilled enough to pay for both.',
    coreValues: ['Health before hustle', 'Craft over careerism', 'Family first', 'Financial calm'],
    affirmations: [
      'I keep promises to myself in small ways every day.',
      'Consistency compounds; intensity fades.',
    ],
    yearTheme: { year: 2026, title: 'The year of quiet compounding', why: 'Daily habits over dramatic moves.' },
    roadmap: [
      { horizon: 1, title: 'Pay off debt & run a 10k', notes: 'Health and money under control by year-end.' },
      { horizon: 3, title: 'Launch a profitable side business', notes: 'First revenue this year, stable income by year 3.' },
      { horizon: 5, title: 'Work by choice, not necessity', notes: 'Emergency fund + business income cover the essentials.' },
      { horizon: 10, title: 'The family lake house', notes: 'A place the whole family can visit every summer.' },
    ],
    ikigai: {
      loves: 'Building things, running, slow mornings with the family',
      excels: 'Explaining technical ideas simply',
      worldNeeds: 'Honest tools that make hard things easy',
      paidFor: 'Software engineering and mentoring',
      summary: 'Teach and build in the space between technology and everyday life.',
    },
    wheelReflection:
      'Energy and friends look fine; fitness and money drag the rest down — 2026 is about sleep, runs and the fund.',
  });

  // --- Assessments (two health snapshots so the trend line has a slope) ---
  const healthId = areaId('health');
  await lifeService.assessArea(userId, healthId, {
    score: 5,
    answers: [
      { question: 'How is your sleep?', value: 4 },
      { question: 'How consistent is movement?', value: 3 },
    ],
    note: 'Sleep is erratic; no exercise routine yet.',
  });
  await lifeService.assessArea(userId, healthId, {
    score: 6,
    answers: [
      { question: 'How is your sleep?', value: 6 },
      { question: 'How consistent is movement?', value: 6 },
    ],
    note: 'Two runs a week now.',
  });
  await lifeService.assessArea(userId, areaId('career'), { score: 6 });

  // --- Goal 1: health, milestones-based, half done ---
  const runResult = await goalService.createGoal(userId, {
    areaId: healthId,
    title: 'Run a 10K race',
    type: 'short',
    status: 'active',
    why: 'Energy now, independence later.',
    startDate: new Date(Date.now() - 42 * DAY).toISOString(),
    targetDate: new Date(Date.now() + 70 * DAY).toISOString(),
    importance: 3,
    urgency: 2,
    effort: 2,
    impact: 4,
    moscow: 'must',
    weight: 40,
    rewardIdea: 'New running shoes',
    smartChecklist: [
      { text: 'Race bookable by next month', checked: true },
      { text: 'Three runs per week', checked: true },
    ],
    obstaclesSolutions: [{ obstacle: 'Bad weather', solution: 'Treadmill fallback goes into the plan' }],
  });
  const healthGoal = runResult.goal;

  const milestones = [
    { title: 'Register for a race', dueDate: new Date(Date.now() - 28 * DAY).toISOString(), reward: '' },
    { title: 'Build up to 5k without stopping', dueDate: new Date(Date.now() - 7 * DAY).toISOString(), reward: 'Nice coffee grinder' },
    { title: 'Complete a 10k practice run', dueDate: new Date(Date.now() + 21 * DAY).toISOString(), reward: '' },
    { title: 'Race day', dueDate: new Date(Date.now() + 63 * DAY).toISOString(), reward: 'Sushi night' },
  ];
  const created = [];
  for (let i = 0; i < milestones.length; i += 1) {
    const result = await goalService.createMilestone(userId, healthGoal._id, milestones[i]);
    created.push(result.milestone);
  }
  for (let i = 0; i < 2; i += 1) {
    await goalService.updateMilestone(userId, healthGoal._id, created[i]._id, { status: 'done' });
  }

  // --- Goal 2: career, OKR with key results ---
  await goalService.createGoal(userId, {
    areaId: areaId('career'),
    title: 'Become a confident TypeScript engineer',
    type: 'okr',
    status: 'active',
    why: 'Engineering growth and a raise case.',
    startDate: new Date(Date.now() - 30 * DAY).toISOString(),
    targetDate: new Date(Date.now() + 120 * DAY).toISOString(),
    importance: 4,
    urgency: 3,
    effort: 3,
    impact: 4,
    weight: 50,
    moscow: 'must',
    okrKeyResults: [
      { title: 'Ship an internal library with tested API', unit: '% test coverage', current: 30, target: 90 },
      { title: 'Convert legacy scripts to strict mode', unit: 'files migrated', current: 12, target: 40 },
      { title: 'Give a talk on typed patterns', unit: 'talks', current: 0, target: 1 },
    ],
  });

  // --- Goal 3: bucket-list trip in Fun & Hobbies (excluded from area scoring by design) ---
  await goalService.createGoal(userId, {
    areaId: areaId('fun-hobbies'),
    title: 'Hike Machu Picchu with Dad',
    type: 'lifetime',
    status: 'idea',
    isBucketList: true,
    why: 'One of the trips we promised each other.',
    targetDate: new Date(Date.now() + 300 * DAY).toISOString(),
    manualProgress: 0,
  });

  // Vision board stays empty until the user uploads images through the app.
  await lifeService.visionGet(userId);

  console.log('[seed] Phase 2 demo data complete:', {
    vision: Boolean(await Vision.exists({ userId })),
    assessments: await Assessment.countDocuments({ userId }),
    goals: await Goal.countDocuments({ userId }),
    milestones: await Milestone.countDocuments({ userId }),
  });
}

async function main() {
  await connectDb();

  const demoUser = await upsertUser({ ...DEMO, role: 'user' });
  await ensurePhase2Demo(demoUser._id.toString());

  if (env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD) {
    await upsertUser({
      email: env.INITIAL_ADMIN_EMAIL,
      name: 'LifeOS Admin',
      password: env.INITIAL_ADMIN_PASSWORD,
      role: 'admin',
    });
  } else {
    console.log('[seed] INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set — skipping admin bootstrap');
  }

  console.log('\n[seed] Demo credentials → email: demo@lifeos.app   password: ChangeMe!2026\n');
  await disconnectDb();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
