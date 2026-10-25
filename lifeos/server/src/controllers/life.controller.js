'use strict';

const lifeService = require('../services/life.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const uid = (req) => req.user._id.toString();

// ---------- Life areas ----------

exports.listAreas = async (req, res, next) => {
  try {
    ok(res, { areas: await lifeService.listAreas(uid(req), { includeArchived: req.query.includeArchived === 'true' }) });
  } catch (err) {
    next(err);
  }
};
exports.getWheel = async (req, res, next) => {
  try {
    ok(res, { areas: await lifeService.wheel(uid(req)) });
  } catch (err) {
    next(err);
  }
};
exports.createArea = async (req, res, next) => {
  try {
    ok(res, { area: await lifeService.createArea(uid(req), req.body) }, 201);
  } catch (err) {
    next(err);
  }
};
exports.updateArea = async (req, res, next) => {
  try {
    ok(res, { area: await lifeService.updateArea(uid(req), req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
};
exports.reorderAreas = async (req, res, next) => {
  try {
    ok(res, { areas: await lifeService.reorderAreas(uid(req), req.body.order) });
  } catch (err) {
    next(err);
  }
};
exports.deleteArea = async (req, res, next) => {
  try {
    ok(res, await lifeService.deleteArea(uid(req), req.params.id));
  } catch (err) {
    next(err);
  }
};

// ---------- Assessments ----------

exports.assessArea = async (req, res, next) => {
  try {
    ok(res, await lifeService.assessArea(uid(req), req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};
exports.listAssessments = async (req, res, next) => {
  try {
    ok(res, await lifeService.listAssessments(uid(req), req.query));
  } catch (err) {
    next(err);
  }
};

// ---------- Vision ----------

exports.visionGet = async (req, res, next) => {
  try {
    ok(res, { vision: await lifeService.visionGet(uid(req)) });
  } catch (err) {
    next(err);
  }
};
exports.visionUpdate = async (req, res, next) => {
  try {
    ok(res, { vision: await lifeService.visionUpdate(uid(req), req.body) });
  } catch (err) {
    next(err);
  }
};
exports.addBoardImage = async (req, res, next) => {
  try {
    ok(res, { vision: await lifeService.addBoardImage(uid(req), req.body) });
  } catch (err) {
    next(err);
  }
};
exports.removeBoardImage = async (req, res, next) => {
  try {
    ok(res, { vision: await lifeService.removeBoardImage(uid(req), req.params.imageId) });
  } catch (err) {
    next(err);
  }
};
exports.reorderBoard = async (req, res, next) => {
  try {
    ok(res, { vision: await lifeService.reorderBoard(uid(req), req.body.order) });
  } catch (err) {
    next(err);
  }
};

// ---------- Decisions ----------

exports.listDecisions = async (req, res, next) => {
  try {
    ok(res, await lifeService.listDecisions(uid(req), req.query));
  } catch (err) {
    next(err);
  }
};
exports.createDecision = async (req, res, next) => {
  try {
    ok(res, { decision: await lifeService.createDecision(uid(req), req.body) }, 201);
  } catch (err) {
    next(err);
  }
};
exports.updateDecision = async (req, res, next) => {
  try {
    ok(res, { decision: await lifeService.updateDecision(uid(req), req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
};
exports.deleteDecision = async (req, res, next) => {
  try {
    ok(res, await lifeService.deleteDecision(uid(req), req.params.id));
  } catch (err) {
    next(err);
  }
};

// POST /auth/me/onboarding/complete (mounted from auth.routes)
exports.onboardingComplete = async (req, res, next) => {
  try {
    ok(res, await lifeService.onboardingComplete(uid(req), req.body));
  } catch (err) {
    next(err);
  }
};
