'use strict';

const goalService = require('../services/goal.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const uid = (req) => req.user._id.toString();

// ---------- Goals ----------

exports.list = async (req, res, next) => {
  try {
    ok(res, await goalService.listGoals(uid(req), req.query));
  } catch (err) {
    next(err);
  }
};
exports.get = async (req, res, next) => {
  try {
    ok(res, await goalService.getGoal(uid(req), req.params.goalId));
  } catch (err) {
    next(err);
  }
};
exports.create = async (req, res, next) => {
  try {
    ok(res, await goalService.createGoal(uid(req), req.body), 201);
  } catch (err) {
    next(err);
  }
};
exports.update = async (req, res, next) => {
  try {
    ok(res, await goalService.updateGoal(uid(req), req.params.goalId, req.body));
  } catch (err) {
    next(err);
  }
};
exports.delete = async (req, res, next) => {
  try {
    ok(res, await goalService.deleteGoal(uid(req), req.params.goalId));
  } catch (err) {
    next(err);
  }
};

// ---------- Milestones ----------

exports.createMilestone = async (req, res, next) => {
  try {
    ok(res, await goalService.createMilestone(uid(req), req.params.goalId, req.body), 201);
  } catch (err) {
    next(err);
  }
};
exports.updateMilestone = async (req, res, next) => {
  try {
    ok(res, await goalService.updateMilestone(uid(req), req.params.goalId, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};
exports.redeemMilestone = async (req, res, next) => {
  try {
    ok(res, await goalService.redeemMilestone(uid(req), req.params.goalId, req.params.id));
  } catch (err) {
    next(err);
  }
};
exports.deleteMilestone = async (req, res, next) => {
  try {
    ok(res, await goalService.deleteMilestone(uid(req), req.params.goalId, req.params.id));
  } catch (err) {
    next(err);
  }
};
exports.reorderMilestones = async (req, res, next) => {
  try {
    ok(res, await goalService.reorderMilestones(uid(req), req.params.goalId, req.body.order));
  } catch (err) {
    next(err);
  }
};

// ---------- Risks ----------

exports.addRisk = async (req, res, next) => {
  try {
    ok(res, await goalService.addRisk(uid(req), req.params.goalId, req.body), 201);
  } catch (err) {
    next(err);
  }
};
exports.updateRisk = async (req, res, next) => {
  try {
    ok(res, await goalService.updateRisk(uid(req), req.params.goalId, req.params.index, req.body));
  } catch (err) {
    next(err);
  }
};
exports.deleteRisk = async (req, res, next) => {
  try {
    ok(res, await goalService.deleteRisk(uid(req), req.params.goalId, req.params.index));
  } catch (err) {
    next(err);
  }
};

// ---------- Dependencies ----------

exports.addDependency = async (req, res, next) => {
  try {
    ok(res, await goalService.addDependency(uid(req), req.params.goalId, req.body.depId));
  } catch (err) {
    next(err);
  }
};
exports.removeDependency = async (req, res, next) => {
  try {
    ok(res, await goalService.removeDependency(uid(req), req.params.goalId, req.params.depId));
  } catch (err) {
    next(err);
  }
};
exports.dependencyCandidates = async (req, res, next) => {
  try {
    ok(res, await goalService.listDependencyCandidates(uid(req), req.params.goalId));
  } catch (err) {
    next(err);
  }
};

// ---------- Analytics ----------

exports.analyticsComparison = async (req, res, next) => {
  try {
    ok(res, await goalService.analyticsComparison(uid(req)));
  } catch (err) {
    next(err);
  }
};
exports.analyticsImpactEffort = async (req, res, next) => {
  try {
    ok(res, await goalService.analyticsImpactEffort(uid(req)));
  } catch (err) {
    next(err);
  }
};
exports.analyticsGantt = async (req, res, next) => {
  try {
    ok(res, await goalService.analyticsGantt(uid(req)));
  } catch (err) {
    next(err);
  }
};
exports.burnup = async (req, res, next) => {
  try {
    ok(res, await goalService.burnup(uid(req), req.params.goalId));
  } catch (err) {
    next(err);
  }
};

// ---------- Templates (save current goal as a template) ----------

exports.makeTemplate = async (req, res, next) => {
  try {
    ok(res, await goalService.createTemplateFromGoal(uid(req), req.params.goalId, req.body.templateKey), 201);
  } catch (err) {
    next(err);
  }
};
