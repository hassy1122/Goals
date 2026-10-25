'use strict';

const Goal = require('../models/Goal');
const LifeArea = require('../models/LifeArea');
const Milestone = require('../models/Milestone');
const { notFound } = require('../utils/apiError');

// ---------- Priority scoring ----------
// priorityScore = round(((Importance×3 + Impact×2 + Urgency×2) ÷ Effort) × 10) / 10
// Labels: ≥9 critical · ≥7 high · ≥5 medium · ≥3 low · <3 optional.

function labelFor(score) {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 5) return 'medium';
  if (score >= 3) return 'low';
  return 'optional';
}

function computePriority({ importance, impact, urgency, effort }) {
  const effortSafe = Math.max(1, Number(effort) || 1);
  const raw = (Number(importance) * 3 + Number(impact) * 2 + Number(urgency) * 2) / effortSafe;
  const score = Math.round(raw * 10) / 10;
  return { score, label: labelFor(score) };
}

// ---------- Progress computation ----------
// Derivation rule (approved): okr → average key-result attainment;
// milestones exist → milestone average; successMetrics exist → metric ratios;
// else manual. Bucket-list and template goals never feed scoring.

const clampPercent = (n) => Math.max(0, Math.min(100, n));

function milestoneProgress(milestone) {
  if (milestone.status === 'done') return 100;
  const total = milestone.tasksTotal || 0;
  if (total > 0) {
    return clampPercent(Math.round(((milestone.tasksDone || 0) / total) * 100));
  }
  return 0;
}

function computeGoalProgress(goal, milestones = []) {
  const hasKR = goal.type === 'okr' && (goal.okrKeyResults || []).length > 0;
  const hasMilestones = milestones.length > 0;
  const hasMetrics = (goal.successMetrics || []).length > 0;

  const source = hasKR ? 'key-results' : hasMilestones ? 'milestones' : hasMetrics ? 'metrics' : 'manual';

  let percent = 0;
  if (source === 'key-results') {
    const krs = goal.okrKeyResults.filter((r) => Number(r.target) !== 0);
    percent = krs.length
      ? krs.reduce((sum, r) => sum + clampPercent((Number(r.current) / Number(r.target)) * 100), 0) / krs.length
      : 0;
  } else if (source === 'milestones') {
    percent = milestones.reduce((sum, m) => sum + milestoneProgress(m), 0) / milestones.length;
  } else if (source === 'metrics') {
    const metrics = goal.successMetrics.filter((m) => Number(m.target) !== 0);
    percent = metrics.length
      ? metrics.reduce((sum, m) => sum + clampPercent((Number(m.current) / Number(m.target)) * 100), 0) / metrics.length
      : 0;
  } else {
    percent = goal.manualProgress || 0;
  }

  return { source, percent: clampPercent(Math.round(percent * 10) / 10) };
}

// One entry per day (same-day edits update in place); hard cap 400 points.
function pushProgressHistory(goal, percent) {
  const dayKey = new Date().toISOString().slice(0, 10);
  const history = goal.progressHistory || [];
  const last = history[history.length - 1];

  if (last && new Date(last.date).toISOString().slice(0, 10) === dayKey) {
    last.percent = percent;
  } else {
    history.push({ date: new Date(), percent });
  }
  while (history.length > 400) history.shift();
  goal.progressHistory = history;
}

// Recomputes denormalized progress for one goal, auto-completes at 100%,
// appends history, and rolls the score up into the parent life area.
async function recomputeGoal(goalId, { userId } = {}) {
  const goal = await Goal.findOne(userId ? { _id: goalId, userId } : { _id: goalId });
  if (!goal) throw notFound('Goal not found.');
  if (goal.isTemplate) return { goal, celebration: false };

  const milestones = await Milestone.find({ goalId: goal._id }).sort({ order: 1 }).lean();
  const { source, percent } = computeGoalProgress(goal, milestones);

  goal.progressSource = source;
  goal.progressPercent = percent;
  goal.counts = {
    milestonesDone: milestones.filter((m) => m.status === 'done').length,
    milestonesTotal: milestones.length,
    tasksDone: (goal.counts && goal.counts.tasksDone) || 0,
    tasksTotal: (goal.counts && goal.counts.tasksTotal) || 0,
  };

  let celebration = false;
  if (percent >= 100 && !['completed', 'dropped', 'failed'].includes(goal.status)) {
    goal.status = 'completed';
    goal.completedAt = new Date();
    celebration = true;
  }

  pushProgressHistory(goal, percent);
  await goal.save();
  await recomputeAreaGoalScore(goal.userId, goal.areaId);

  return { goal, celebration };
}

// Weighted mean of goal progress for a life area, rescaled to 0..10.
// Excludes bucket-list goals and templates from scoring by design.
async function recomputeAreaGoalScore(userId, areaId) {
  const goals = await Goal.find({
    userId,
    areaId,
    isBucketList: false,
    isTemplate: false,
    archived: false,
  })
    .select('weight progressPercent')
    .lean();

  const totalWeight = goals.reduce((sum, g) => sum + (g.weight || 0), 0);
  const weighted = goals.reduce((sum, g) => sum + (g.weight || 0) * (g.progressPercent || 0), 0);
  const goalScore = totalWeight > 0 ? Math.round((weighted / totalWeight / 10) * 10) / 10 : 0;

  await LifeArea.updateOne({ _id: areaId, userId }, { goalScore });
  return goalScore;
}

// Cycle guard for goal dependencies: walking forward from `depId` through its
// dependsOn chain must never reach `goalId` (which would create a loop).
async function dependencyWouldCycle(goalId, depId) {
  const seen = new Set([String(goalId)]);
  let frontier = [String(depId)];

  while (frontier.length > 0) {
    const next = await Goal.find({ _id: { $in: frontier } }).select('dependsOn').lean();
    frontier = [];
    for (const goal of next) {
      for (const dep of goal.dependsOn || []) {
        const depStr = String(dep);
        if (seen.has(depStr)) return true;
        seen.add(depStr);
        frontier.push(depStr);
      }
    }
  }
  return false;
}

module.exports = {
  clampPercent,
  computePriority,
  labelFor,
  milestoneProgress,
  computeGoalProgress,
  pushProgressHistory,
  recomputeGoal,
  recomputeAreaGoalScore,
  dependencyWouldCycle,
};
