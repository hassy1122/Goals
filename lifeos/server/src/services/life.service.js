'use strict';

const LifeArea = require('../models/LifeArea');
const Vision = require('../models/Vision');
const Assessment = require('../models/Assessment');
const Decision = require('../models/Decision');
const Goal = require('../models/Goal');
const Upload = require('../models/Upload');
const User = require('../models/User');
const goalService = require('./goal.service');
const { conflict, notFound, badRequest } = require('../utils/apiError');
const { paginate } = require('../utils/paginate');

// Balance wheel blending: 60% self-assessment score + 40% goal-derived score.
const BLEND_ASSESSMENT = 0.6;
const BLEND_GOAL = 0.4;

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'area';

const blend = (area) => Math.round((area.currentScore * BLEND_ASSESSMENT + area.goalScore * BLEND_GOAL) * 10) / 10;

// ---------- Life areas ----------

async function listAreas(userId, { includeArchived = false } = {}) {
  const filter = { userId, ...(includeArchived ? {} : { archived: false }) };
  const areas = await LifeArea.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  return areas.map((area) => ({ ...area, blendedScore: blend(area) }));
}

async function createArea(userId, data = {}) {
  const count = await LifeArea.countDocuments({ userId });
  try {
    const area = await LifeArea.create({
      name: data.name,
      key: data.key || slugify(data.name),
      icon: data.icon,
      color: data.color,
      targetScore: data.targetScore,
      notes: data.notes,
      order: count + 1,
      userId,
    });
    return area;
  } catch (err) {
    if (err && err.code === 11000) throw conflict('An area with that name already exists.', 'DUPLICATE_AREA');
    throw err;
  }
}

async function updateArea(userId, areaId, patch) {
  const area = await LifeArea.findOne({ _id: areaId, userId });
  if (!area) throw notFound('Area not found.');

  for (const key of ['name', 'icon', 'color', 'targetScore', 'notes', 'archived']) {
    if (patch[key] !== undefined) area[key] = patch[key];
  }
  try {
    await area.save();
  } catch (err) {
    if (err && err.code === 11000) throw conflict('An area with that name already exists.', 'DUPLICATE_AREA');
    throw err;
  }
  return area;
}

async function reorderAreas(userId, orderedIds) {
  const areas = await LifeArea.find({ userId, _id: { $in: orderedIds } });
  const byId = new Map(areas.map((a) => [String(a._id), a]));

  const unknown = orderedIds.filter((id) => !byId.has(id));
  if (unknown.length > 0) throw notFound('One of the areas no longer exists.', 'AREA_NOT_FOUND');

  await Promise.all(
    orderedIds.map((id, index) => {
      const area = byId.get(id);
      area.order = index + 1;
      return area.save();
    }),
  );
  return listAreas(userId);
}

async function deleteArea(userId, areaId) {
  const area = await LifeArea.findOne({ _id: areaId, userId });
  if (!area) throw notFound('Area not found.');

  const linked = await Goal.countDocuments({ userId, areaId });
  if (linked > 0) {
    throw conflict(
      'This area still has goals attached. Move them to another area or delete them first.',
      'AREA_IN_USE',
    );
  }

  await Promise.all([
    Assessment.deleteMany({ userId, areaId }),
    LifeArea.deleteOne({ _id: areaId, userId }),
  ]);
  return { deleted: true };
}

// ---------- Assessments ----------

async function assessArea(userId, areaId, { score, answers = [], note = '' }) {
  const area = await LifeArea.findOne({ _id: areaId, userId });
  if (!area) throw notFound('Area not found.');

  const assessment = await Assessment.create({ userId, areaId, score, answers, note, source: 'manual' });
  area.currentScore = score;
  await area.save();
  return { assessment, area: { ...area.toObject(), blendedScore: blend(area.toObject()) } };
}

async function listAssessments(userId, { areaId, page, limit }) {
  const filter = { userId, ...(areaId ? { areaId } : {}) };
  const { items, total, pages, page: p } = await paginate(Assessment, filter, { page, limit, sort: '-date -createdAt' });
  return { assessments: items, total, pages, page: p };
}

// ---------- Wheel ----------

async function wheel(userId) {
  const areas = await listAreas(userId);
  return Promise.all(
    areas.map(async (area) => {
      const [latest, count] = await Promise.all([
        Assessment.findOne({ userId, areaId: area._id }).sort({ date: -1 }).lean(),
        Assessment.countDocuments({ userId, areaId: area._id }),
      ]);
      return {
        ...area,
        latestAssessment: latest ? { score: latest.score, date: latest.date, note: latest.note } : null,
        assessmentCount: count,
      };
    }),
  );
}

// ---------- Vision ----------

async function visionGet(userId) {
  let doc = await Vision.findOne({ userId });
  if (!doc) doc = await Vision.create({ userId });
  return doc;
}

async function visionUpdate(userId, patch = {}) {
  const doc = await visionGet(userId);
  for (const key of ['statement', 'coreValues', 'affirmations', 'yearTheme', 'roadmap', 'ikigai', 'wheelReflection']) {
    if (patch[key] !== undefined) doc[key] = patch[key];
  }
  await doc.save();
  return doc;
}

async function addBoardImage(userId, { uploadId, caption = '', order }) {
  const upload = await Upload.findOne({ _id: uploadId, userId });
  if (!upload) throw notFound('Upload not found.', 'UPLOAD_NOT_FOUND');
  if (upload.category !== 'image') throw badRequest('Only images can go on the vision board.');

  const doc = await visionGet(userId);
  if (doc.boardImages.some((img) => String(img.uploadId) === String(uploadId))) {
    throw conflict('That image is already on the board.', 'DUPLICATE');
  }
  doc.boardImages.push({ uploadId, caption, order: order ?? doc.boardImages.length });
  await doc.save();
  return doc;
}

async function removeBoardImage(userId, imageId) {
  const doc = await visionGet(userId);
  const img = doc.boardImages.id(imageId);
  if (!img) throw notFound('Board image not found.', 'NOT_FOUND');
  img.deleteOne();
  await doc.save();
  return doc;
}

async function reorderBoard(userId, orderedIds) {
  const doc = await visionGet(userId);
  doc.boardImages.forEach((img) => {
    const idx = orderedIds.indexOf(String(img._id));
    if (idx >= 0) img.order = idx;
  });
  await doc.save();
  return doc;
}

// ---------- Decisions ----------

async function listDecisions(userId, { status, page, limit }) {
  const filter = { userId, ...(status ? { status } : {}) };
  const { items, total, pages, page: p } = await paginate(Decision, filter, { page, limit, sort: '-updatedAt' });
  return { decisions: items, total, pages, page: p };
}

async function createDecision(userId, data = {}) {
  if (data.areaId) {
    const area = await LifeArea.countDocuments({ _id: data.areaId, userId });
    if (area === 0) throw notFound('Area not found.', 'AREA_NOT_FOUND');
  }
  return Decision.create({ ...data, userId });
}

async function updateDecision(userId, id, patch = {}) {
  const doc = await Decision.findOne({ _id: id, userId });
  if (!doc) throw notFound('Decision not found.');

  for (const key of ['title', 'notes', 'areaId', 'status', 'options', 'chosenOptionIndex', 'whatIfScenario', 'preMortem']) {
    if (patch[key] !== undefined) doc[key] = patch[key];
  }

  if (patch.chosenOptionIndex != null && Array.isArray(doc.options) && patch.chosenOptionIndex >= doc.options.length) {
    throw badRequest('chosenOptionIndex is out of range of the options.');
  }
  if (doc.status === 'decided' && !doc.decidedAt) doc.decidedAt = new Date();
  if (doc.status !== 'decided' && patch.decidedAt == null && patch.status) doc.decidedAt = null;

  await doc.save();
  return doc;
}

async function deleteDecision(userId, id) {
  const result = await Decision.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw notFound('Decision not found.');
  return { deleted: true };
}

// ---------- Onboarding ----------

async function onboardingComplete(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.');

  let areasUpdated = 0;
  for (const target of payload.areas || []) {
    const result = await LifeArea.updateOne(
      { _id: target.areaId, userId },
      { targetScore: target.targetScore },
    );
    if (result.matchedCount === 0) throw notFound('One of the target areas no longer exists.', 'AREA_NOT_FOUND');
    areasUpdated += 1;
  }

  let vision = null;
  if (payload.statement || payload.coreValues) {
    vision = await visionUpdate(userId, {
      ...(payload.statement !== undefined ? { statement: payload.statement } : {}),
      ...(payload.coreValues ? { coreValues: payload.coreValues } : {}),
    });
  }

  let goal = null;
  if (payload.firstGoal) {
    const created = await goalService.createGoal(userId, {
      areaId: payload.firstGoal.areaId,
      title: payload.firstGoal.title,
      type: 'short',
      status: 'active',
      startDate: new Date().toISOString(),
      targetDate: payload.firstGoal.targetDate,
    });
    goal = created.goal;
  }

  user.onboarding.done = true;
  await user.save();

  return { areasUpdated, vision, goal };
}

module.exports = {
  BLEND_ASSESSMENT,
  BLEND_GOAL,
  slugify,
  blend,
  listAreas,
  createArea,
  updateArea,
  reorderAreas,
  deleteArea,
  assessArea,
  listAssessments,
  wheel,
  visionGet,
  visionUpdate,
  addBoardImage,
  removeBoardImage,
  reorderBoard,
  listDecisions,
  createDecision,
  updateDecision,
  deleteDecision,
  onboardingComplete,
};
