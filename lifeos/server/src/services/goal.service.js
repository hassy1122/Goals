'use strict';

const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const LifeArea = require('../models/LifeArea');
const { SYSTEM_TEMPLATES } = require('../utils/goalTemplates');
const progress = require('./progress.service');
const { conflict, notFound, badRequest } = require('../utils/apiError');
const { paginate } = require('../utils/paginate');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'goal';

const VIEWS = {
  all: { isTemplate: false },
  active: { status: 'active', isTemplate: false, archived: false },
  'in-progress': { status: { $in: ['active', 'planned'] }, isTemplate: false, archived: false },
  idea: { status: 'idea', isTemplate: false, archived: false },
  planned: { status: 'planned', isTemplate: false, archived: false },
  paused: { status: 'paused', isTemplate: false, archived: false },
  completed: { status: 'completed', isTemplate: false, archived: false },
  dropped: { status: 'dropped', isTemplate: false, archived: false },
  failed: { status: 'failed', isTemplate: false, archived: false },
  archived: { archived: true, isTemplate: false },
  bucket: { isBucketList: true, isTemplate: false, archived: false },
  okr: { type: 'okr', isTemplate: false, archived: false },
};

const SORTS = {
  priority: '-priorityScore createdAt',
  target: 'targetDate createdAt',
  created: '-createdAt',
  progress: '-progressPercent',
  alpha: 'title',
};

async function assertArea(userId, areaId) {
  const count = await LifeArea.countDocuments({ _id: areaId, userId });
  if (count === 0) throw notFound('Life area not found.', 'AREA_NOT_FOUND');
}

// Σ weights of scoring-relevant goals in the area must stay ≤ 100.
async function assertWeightFits(userId, areaId, goalId, weight) {
  const others = await Goal.find({
    userId,
    areaId,
    isTemplate: false,
    isBucketList: false,
    archived: false,
    ...(goalId ? { _id: { $ne: goalId } } : {}),
  })
    .select('weight')
    .lean();
  const sum = others.reduce((s, g) => s + (g.weight || 0), weight);
  if (sum > 100) {
    throw conflict(
      `Total goal weights for this area would be ${sum}%. Reduce weights so the area sums to ≤ 100.`,
      'WEIGHT_OVERFLOW',
    );
  }
}

async function createGoal(userId, input = {}) {
  await assertArea(userId, input.areaId);

  const isBucketList = Boolean(input.isBucketList);
  const weight = input.weight;
  if (!isBucketList && weight !== undefined) await assertWeightFits(userId, input.areaId, null, weight);

  const { score, label } = progress.computePriority({
    importance: input.importance ?? 3,
    impact: input.impact ?? 3,
    urgency: input.urgency ?? 3,
    effort: input.effort ?? 3,
  });

  let goal = await Goal.create({
    userId,
    areaId: input.areaId,
    type: input.type ?? 'medium',
    title: input.title,
    description: input.description ?? '',
    why: input.why ?? '',
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    targetDate: input.targetDate ? new Date(input.targetDate) : null,
    status: input.status ?? 'idea',
    importance: input.importance ?? 3,
    urgency: input.urgency ?? 3,
    effort: input.effort ?? 3,
    impact: input.impact ?? 3,
    priorityScore: score,
    priorityLabel: label,
    moscow: input.moscow ?? null,
    weight: weight ?? 10,
    smartChecklist: input.smartChecklist ?? [],
    successMetrics: input.successMetrics ?? [],
    obstaclesSolutions: input.obstaclesSolutions ?? [],
    okrKeyResults: input.okrKeyResults ?? [],
    manualProgress: input.manualProgress ?? 0,
    coverUploadId: input.coverUploadId ?? null,
    isBucketList,
  });

  if (goal.status === 'completed') goal.completedAt = new Date();
  await goal.save();
  // recomputeGoal persists progress fields + history itself; return ITS saved copy.
  const { goal: fresh, celebration } = await progress.recomputeGoal(goal._id, { userId });
  return { goal: fresh, celebration };
}

async function updateGoal(userId, goalId, patch = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');

  const oldAreaId = String(goal.areaId);
  const areaChanged = patch.areaId && String(patch.areaId) !== oldAreaId;
  if (areaChanged) await assertArea(userId, patch.areaId);

  const weightSet = patch.weight !== undefined && !goal.isBucketList;
  if (weightSet && (patch.areaId ? String(patch.areaId) : String(goal.areaId))) {
    await assertWeightFits(userId, patch.areaId ?? goal.areaId, goal._id, patch.weight);
  }

  const statusChanged = patch.status !== undefined && patch.status !== goal.status;
  for (const key of [
    'areaId',
    'type',
    'title',
    'description',
    'why',
    'startDate',
    'targetDate',
    'status',
    'importance',
    'urgency',
    'effort',
    'impact',
    'moscow',
    'weight',
    'smartChecklist',
    'successMetrics',
    'obstaclesSolutions',
    'okrKeyResults',
    'manualProgress',
    'coverUploadId',
    'isBucketList',
    'archived',
  ]) {
    if (patch[key] !== undefined) goal[key] = patch[key];
  }
  // Date strings → Date fields (the rest are strings/numbers/arrays already).
  if (patch.startDate !== undefined) goal.startDate = patch.startDate ? new Date(patch.startDate) : undefined;
  if (patch.targetDate !== undefined) goal.targetDate = patch.targetDate ? new Date(patch.targetDate) : null;

  if (statusChanged) {
    if (patch.status === 'completed') {
      goal.completedAt = new Date();
    } else {
      goal.completedAt = null;
    }
  }

  const { score, label } = progress.computePriority(goal);
  goal.priorityScore = score;
  goal.priorityLabel = label;

  await goal.save();

  // recomputeGoal returns a freshly saved copy — don't reassign the const above.
  const recomputed = await progress.recomputeGoal(goal._id, { userId });

  if (areaChanged) await progress.recomputeAreaGoalScore(userId, oldAreaId);

  return { goal: recomputed.goal, celebration: recomputed.celebration, statusChanged };
}

async function deleteGoal(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw notFound('Goal not found.');

  await Promise.all([
    Milestone.deleteMany({ userId, goalId }),
    Goal.updateMany({ userId, dependsOn: goalId }, { $pull: { dependsOn: goalId } }),
    Goal.deleteOne({ _id: goalId, userId }),
  ]);
  if (!goal.isTemplate) await progress.recomputeAreaGoalScore(userId, goal.areaId);
  return { deleted: true };
}

async function enrichBlockers(userId, items) {
  const depIds = [...new Set(items.flatMap((g) => (g.dependsOn || []).map(String)))];
  if (depIds.length === 0) return items;

  const deps = await Goal.find({ userId, _id: { $in: depIds } })
    .select('title status targetDate')
    .lean();
  const byId = new Map(deps.map((d) => [String(d._id), d]));

  for (const goal of items) {
    const infos = (goal.dependsOn || []).map((id) => {
      const dep = byId.get(String(id));
      return dep
        ? { id: dep._id, title: dep.title, status: dep.status, targetDate: dep.targetDate }
        : { id, title: '(deleted goal)', status: 'missing', targetDate: null };
    });
    goal.dependsOn = infos;
    goal.blocked = infos.some((d) => d.status !== 'completed' && d.status !== 'missing');
  }
  return items;
}

async function listGoals(userId, query = {}) {
  const { view, areaId, type, status, q, sort, page, limit } = query;
  const filter = { ...(VIEWS[view] || { isTemplate: false, archived: false }) };
  if (areaId) filter.areaId = areaId;
  if (type) filter.type = type;
  if (status && view !== status) filter.status = status;
  if (q && q.trim()) filter.$or = [{ title: new RegExp(escapeRegex(q.trim()), 'i') }];

  const { items, total, pages, page: p } = await paginate(Goal, filter, {
    page,
    limit,
    sort: SORTS[sort || 'priority'],
  });

  await enrichBlockers(userId, items);

  // Sticky area metadata so every view can show where a goal lives.
  const areas = await LifeArea.find({ userId }).select('name icon').lean();
  const areaById = new Map(areas.map((a) => [String(a._id), a]));
  for (const goal of items) {
    const area = areaById.get(String(goal.areaId));
    goal.areaName = area?.name || '';
    goal.areaIcon = area?.icon || '';
  }

  return { goals: items, total, pages, page: p };
}

async function getGoal(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');

  const milestones = await Milestone.find({ userId, goalId }).sort({ order: 1 }).lean();
  const [enriched] = await enrichBlockers(userId, [goal.toObject()]);

  const area = await LifeArea.findOne({ userId, _id: enriched.areaId }).select('name icon').lean();
  enriched.areaName = area?.name || '';
  enriched.areaIcon = area?.icon || '';

  return { goal: enriched, milestones };
}

// ---------- Milestones ----------

async function createMilestone(userId, goalId, data = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');

  const count = await Milestone.countDocuments({ goalId });
  const milestone = await Milestone.create({
    userId,
    goalId,
    title: data.title,
    description: data.description ?? '',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    reward: data.reward ?? '',
    order: count + 1,
  });
  await progress.recomputeGoal(goalId, { userId });
  return { goal, milestone };
}

async function updateMilestone(userId, goalId, milestoneId, patch = {}) {
  const milestone = await Milestone.findOne({ _id: milestoneId, userId, goalId });
  if (!milestone) throw notFound('Milestone not found.');

  for (const key of ['title', 'description', 'status', 'reward']) {
    if (patch[key] !== undefined) milestone[key] = patch[key];
  }
  if (patch.dueDate !== undefined) milestone.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;

  await milestone.save();
  await progress.recomputeGoal(goalId, { userId });
  return { milestone };
}

async function redeemMilestone(userId, goalId, milestoneId) {
  const milestone = await Milestone.findOne({ _id: milestoneId, userId, goalId });
  if (!milestone) throw notFound('Milestone not found.');
  if (!milestone.reward) throw badRequest('This milestone has no reward attached.', 'NO_REWARD');

  milestone.rewardRedeemedAt = new Date();
  await milestone.save();
  return { milestone };
}

async function deleteMilestone(userId, goalId, milestoneId) {
  const result = await Milestone.deleteOne({ _id: milestoneId, userId, goalId });
  if (result.deletedCount === 0) throw notFound('Milestone not found.');
  await progress.recomputeGoal(goalId, { userId });
  return { deleted: true };
}

async function reorderMilestones(userId, goalId, orderedIds) {
  const milestones = await Milestone.find({ userId, goalId, _id: { $in: orderedIds } });
  const byId = new Map(milestones.map((m) => [String(m._id), m]));

  const unknown = orderedIds.filter((id) => !byId.has(id));
  if (unknown.length > 0) throw notFound('One of the milestones no longer exists.', 'NOT_FOUND');

  await Promise.all(
    orderedIds.map((id, index) => {
      const m = byId.get(id);
      m.order = index + 1;
      return m.save();
    }),
  );
  const milestones2 = await Milestone.find({ userId, goalId }).sort({ order: 1 }).lean();
  return { milestones: milestones2 };
}

// ---------- Risks ----------

async function addRisk(userId, goalId, data = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');

  goal.risks.push({
    risk: data.risk,
    probability: data.probability ?? 3,
    impact: data.impact ?? 3,
    backupPlan: data.backupPlan ?? '',
  });
  await goal.save();
  return { goal, risk: goal.risks[goal.risks.length - 1] };
}

async function updateRisk(userId, goalId, index, data = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');
  if (index >= goal.risks.length) throw notFound('Risk not found.', 'NOT_FOUND');

  for (const key of ['risk', 'probability', 'impact', 'backupPlan']) {
    if (data[key] !== undefined) goal.risks[index][key] = data[key];
  }
  await goal.save();
  return { goal, risk: goal.risks[index] };
}

async function deleteRisk(userId, goalId, index) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');
  if (index >= goal.risks.length) throw notFound('Risk not found.', 'NOT_FOUND');

  goal.risks.splice(index, 1);
  await goal.save();
  return { goal };
}

// ---------- Dependencies ----------

async function addDependency(userId, goalId, depId) {
  if (String(goalId) === String(depId)) throw badRequest('A goal cannot depend on itself.');

  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  const dep = await Goal.findOne({ _id: depId, userId, isTemplate: false });
  if (!goal || !dep) throw notFound('Goal not found.');
  if (goal.dependsOn.some((id) => String(id) === String(depId))) {
    throw conflict('That dependency already exists.', 'DUPLICATE');
  }
  if (await progress.dependencyWouldCycle(goalId, depId)) {
    throw badRequest('That dependency would create a cycle.', 'DEPENDENCY_CYCLE');
  }

  goal.dependsOn.push(depId);
  goal.save();
  return { goal };
}

async function removeDependency(userId, goalId, depId) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw notFound('Goal not found.');
  const before = goal.dependsOn.length;
  goal.dependsOn = goal.dependsOn.filter((id) => String(id) !== String(depId));
  if (goal.dependsOn.length === before) throw notFound('Dependency not found.', 'NOT_FOUND');
  await goal.save();
  return { goal };
}

async function listDependencyCandidates(userId, goalId) {
  // Pick-list for the dependency input: own non-template goals not yet finished.
  const exists = await Goal.countDocuments({ _id: goalId, userId, isTemplate: false });
  if (exists === 0) throw notFound('Goal not found.');

  const docs = await Goal.find({
    userId,
    isTemplate: false,
    _id: { $ne: goalId },
    status: { $ne: 'completed' },
  })
    .select('title status type targetDate')
    .sort(SORTS.priority)
    .lean();
  return { candidates: docs };
}

// ---------- Burn-up ----------

async function burnup(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId, isTemplate: false });
  if (!goal) throw notFound('Goal not found.');

  const start = goal.startDate ? new Date(goal.startDate) : new Date();
  const target = goal.targetDate ? new Date(goal.targetDate) : null;

  const planned = [];
  if (target && target > start) {
    const SAMPLES = 24;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const date = new Date(start.getTime() + ((target - start) * i) / SAMPLES);
      planned.push({ date, percent: Math.round((100 * i) / SAMPLES) });
    }
  }

  const actual = (goal.progressHistory || []).map((h) => ({ date: h.date, percent: h.percent }));

  const duration = target ? (target - start) : 0;
  const expectedToday = target && duration > 0 ? progress.clampPercent(((Date.now() - start) / duration) * 100) : null;

  let status = 'no-target';
  const current = goal.progressPercent;
  if (expectedToday !== null) {
    const diff = current - expectedToday;
    status = diff >= -5 ? 'on-track' : diff >= -20 ? 'at-risk' : 'behind';
  }

  return { planned, actual, current, expectedToday, status };
}

// ---------- Analytics ----------

const ANALYTICS_FIELDS =
  'title areaId type status targetDate progressPercent priorityScore priorityLabel isBucketList counts updatedAt';

async function analyticsComparison(userId) {
  const goals = await Goal.find({
    userId,
    isTemplate: false,
    archived: false,
    status: { $nin: ['dropped', 'failed'] },
  })
    .select(ANALYTICS_FIELDS)
    .sort('-priorityScore')
    .lean();
  return { goals };
}

async function analyticsImpactEffort(userId) {
  const goals = await Goal.find({ userId, isTemplate: false, archived: false, status: { $nin: ['dropped', 'failed'] } })
    .select('title impact effort priorityLabel status')
    .sort('-impact -effort')
    .lean();
  return { goals };
}

async function analyticsGantt(userId) {
  const goals = await Goal.find({
    userId,
    isTemplate: false,
    archived: false,
    status: { $nin: ['dropped', 'failed'] },
  })
    .select(`${ANALYTICS_FIELDS} startDate dependsOn`)
    .sort('targetDate')
    .lean();

  const goalIds = goals.map((g) => g._id);
  const milestones = await Milestone.find({ userId, goalId: { $in: goalIds } })
    .select('goalId title dueDate status order')
    .sort('order')
    .lean();

  const byGoal = new Map(goalIds.map((id) => [String(id), []]));
  for (const m of milestones) byGoal.get(String(m.goalId)).push(m);
  for (const g of goals) g.milestones = byGoal.get(String(g._id)).map((m) => ({ id: m._id, title: m.title, dueDate: m.dueDate, done: m.status === 'done' }));

  await enrichBlockers(userId, goals);
  return { goals };
}

// ---------- Templates ----------

const TEMPLATE_COPY_FIELDS = [
  'type',
  'description',
  'why',
  'importance',
  'urgency',
  'effort',
  'impact',
  'moscow',
  'weight',
  'smartChecklist',
  'successMetrics',
  'obstaclesSolutions',
  'okrKeyResults',
  'rewardIdea',
];

async function listTemplates(userId) {
  const custom = await Goal.find({ userId, isTemplate: true })
    .select(
      `${TEMPLATE_COPY_FIELDS.join(' ')} title templateKey createdAt areaId`,
    )
    .sort('-createdAt')
    .lean();

  const ids = custom.flatMap((c) => (c._id ? [c._id] : []));
  const milestoneCounts = await Promise.all(
    ids.map((id) => Milestone.countDocuments({ userId, goalId: id })),
  );
  const customOut = custom.map((c, i) => ({ ...c, source: 'custom', milestonesCount: milestoneCounts[i] }));
  const systemOut = SYSTEM_TEMPLATES.map((t) => ({
    ...t,
    source: 'system',
    milestonesCount: (t.milestones || []).length,
  }));

  return { system: systemOut, custom: customOut };
}

async function uniqueTemplateKey(userId, base) {
  const taken = new Set([
    ...SYSTEM_TEMPLATES.map((t) => t.templateKey),
    ...(await Goal.find({ userId, isTemplate: true }).select('templateKey').lean()).map((t) => t.templateKey),
  ]);
  let key = base;
  let n = 2;
  while (taken.has(key)) {
    key = `${base}-${n}`;
    n += 1;
  }
  return key;
}

async function createTemplateFromGoal(userId, goalId, providedKey) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw notFound('Goal not found.');
  if (goal.isTemplate) throw badRequest('This goal is already a template.', 'ALREADY_TEMPLATE');

  const key = await uniqueTemplateKey(userId, providedKey ? slugify(providedKey) : slugify(goal.title));

  const template = await Goal.create({
    userId,
    areaId: goal.areaId,
    title: goal.title,
    ...Object.fromEntries(TEMPLATE_COPY_FIELDS.map((f) => [f, goal[f]])),
    status: 'idea',
    isTemplate: true,
    templateKey: key,
    priorityScore: goal.priorityScore,
    priorityLabel: goal.priorityLabel,
  });

  // Clone milestone content onto the template (no dates — applyTemplate dates them).
  const sourceMilestones = await Milestone.find({ userId, goalId: goal._id }).sort('order').lean();
  for (let i = 0; i < sourceMilestones.length; i += 1) {
    await Milestone.create({
      userId,
      goalId: template._id,
      title: sourceMilestones[i].title,
      description: sourceMilestones[i].description,
      reward: sourceMilestones[i].reward,
      order: i + 1,
    });
  }

  return { template };
}

async function applyTemplate(userId, key, { areaId, title, startDate, targetDate }) {
  const start = startDate ? new Date(startDate) : new Date();

  // Custom templates first, then the system library.
  const custom = await Goal.findOne({ userId, templateKey: key, isTemplate: true });
  if (custom) {
    const goal = await createGoal(userId, {
      areaId,
      title: title || custom.title,
      description: custom.description,
      why: custom.why,
      type: custom.type,
      importance: custom.importance,
      urgency: custom.urgency,
      effort: custom.effort,
      impact: custom.impact,
      moscow: custom.moscow,
      weight: custom.weight,
      smartChecklist: custom.smartChecklist,
      successMetrics: custom.successMetrics,
      obstaclesSolutions: custom.obstaclesSolutions,
      okrKeyResults: custom.okrKeyResults,
      startDate: start.toISOString(),
      targetDate,
      status: 'planned',
    });

    const tm = await Milestone.find({ userId, goalId: custom._id }).sort('order').lean();
    for (let i = 0; i < tm.length; i += 1) {
      await Milestone.create({
        userId,
        goalId: goal.goal._id,
        title: tm[i].title,
        description: tm[i].description,
        reward: tm[i].reward,
        order: i + 1,
      });
    }
    return createGoalResponse(userId, goal.goal._id);
  }

  const system = SYSTEM_TEMPLATES.find((t) => t.templateKey === key);
  if (!system) throw notFound('Template not found.', 'TEMPLATE_NOT_FOUND');

  const goalResult = await createGoal(userId, {
    areaId,
    title: title || system.title,
    description: system.description,
    why: system.why,
    type: system.type,
    importance: system.importance,
    urgency: system.urgency,
    effort: system.effort,
    impact: system.impact,
    moscow: system.moscow,
    weight: system.weight,
    smartChecklist: system.smartChecklist,
    successMetrics: system.successMetrics,
    obstaclesSolutions: system.obstaclesSolutions,
    startDate: start.toISOString(),
    targetDate,
    status: 'planned',
  });

  for (let i = 0; i < (system.milestones || []).length; i += 1) {
    const m = system.milestones[i];
    await Milestone.create({
      userId,
      goalId: goalResult.goal._id,
      title: m.title,
      dueDate: m.dueInDays ? new Date(start.getTime() + m.dueInDays * 86400000) : null,
      reward: m.reward || '',
      order: i + 1,
    });
  }
  return createGoalResponse(userId, goalResult.goal._id);
}

// Freshly re-read a created goal as { goal } shape.
async function createGoalResponse(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  const milestones = await Milestone.find({ userId, goalId }).sort('order').lean();
  return { goal, milestones };
}

module.exports = {
  createGoal,
  updateGoal,
  deleteGoal,
  listGoals,
  getGoal,
  createMilestone,
  updateMilestone,
  redeemMilestone,
  deleteMilestone,
  reorderMilestones,
  addRisk,
  updateRisk,
  deleteRisk,
  addDependency,
  removeDependency,
  listDependencyCandidates,
  burnup,
  analyticsComparison,
  analyticsImpactEffort,
  analyticsGantt,
  listTemplates,
  createTemplateFromGoal,
  applyTemplate,
};
