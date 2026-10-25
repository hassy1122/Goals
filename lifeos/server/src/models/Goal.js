'use strict';

const mongoose = require('mongoose');

const GOAL_TYPES = ['short', 'medium', 'long', 'lifetime', 'okr'];
const GOAL_STATUSES = ['idea', 'planned', 'active', 'paused', 'completed', 'dropped', 'failed'];

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'LifeArea', required: true },
    type: { type: String, enum: GOAL_TYPES, default: 'medium' },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 4000 },
    why: { type: String, default: '', maxlength: 2000 },
    startDate: { type: Date, default: Date.now },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: GOAL_STATUSES, default: 'idea' },

    // Importance & priority system (see services/progress.service).
    importance: { type: Number, min: 1, max: 5, default: 3 },
    urgency: { type: Number, min: 1, max: 5, default: 3 },
    effort: { type: Number, min: 1, max: 5, default: 3 },
    impact: { type: Number, min: 1, max: 5, default: 3 },
    priorityScore: { type: Number, default: 10, min: 1, max: 90 },
    priorityLabel: { type: String, enum: ['critical', 'high', 'medium', 'low', 'optional'], default: 'medium' },
    moscow: { type: String, enum: ['must', 'should', 'could', 'wont', null], default: null },

    // Weighted goals: share of the area score (Σ weights per area is validated ≤ 100).
    weight: { type: Number, min: 1, max: 100, default: 10 },

    // SMART checklist & planning fields.
    smartChecklist: [
      { text: { type: String, required: true, maxlength: 300 }, checked: { type: Boolean, default: false } },
    ],
    successMetrics: [
      {
        label: { type: String, required: true, maxlength: 120 },
        unit: { type: String, default: '', maxlength: 20 },
        current: { type: Number, default: 0 },
        target: { type: Number, required: true },
      },
    ],
    obstaclesSolutions: [
      { obstacle: { type: String, required: true, maxlength: 400 }, solution: { type: String, default: '', maxlength: 400 } },
    ],

    // OKR mode (type 'okr'): progress = average attainment across key results.
    okrKeyResults: [
      {
        title: { type: String, required: true, maxlength: 200 },
        unit: { type: String, default: '', maxlength: 20 },
        current: { type: Number, default: 0 },
        target: { type: Number, required: true, default: 1 },
      },
    ],

    // Denormalized progress (see services/progress.service).
    progressSource: { type: String, enum: ['milestones', 'key-results', 'metrics', 'manual'], default: 'manual' },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    manualProgress: { type: Number, min: 0, max: 100, default: 0 },
    counts: {
      milestonesDone: { type: Number, default: 0 },
      milestonesTotal: { type: Number, default: 0 },
      tasksDone: { type: Number, default: 0 },
      tasksTotal: { type: Number, default: 0 },
    },
    progressHistory: [
      { date: { type: Date, default: Date.now }, percent: { type: Number, min: 0, max: 100 } },
    ],

    // Dependency mapping — blocked until referenced goals complete (cycle-guarded).
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],

    // Risk register.
    risks: [
      {
        risk: { type: String, required: true, maxlength: 300 },
        probability: { type: Number, min: 1, max: 5, default: 3 },
        impact: { type: Number, min: 1, max: 5, default: 3 },
        backupPlan: { type: String, default: '', maxlength: 400 },
      },
    ],

    // Rewards attached to milestones live on Milestone; goal-level reward celebration copy:
    rewardIdea: { type: String, default: '', maxlength: 200 },

    // Bucket list & templates.
    isBucketList: { type: Boolean, default: false },
    coverUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    isTemplate: { type: Boolean, default: false },
    templateKey: { type: String, maxlength: 60 }, // omitted when the goal isn't a template
    sourceTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },

    archived: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, status: 1, targetDate: 1 });
goalSchema.index({ userId: 1, areaId: 1 });
goalSchema.index({ userId: 1, type: 1 });
goalSchema.index({ userId: 1, priorityScore: -1 });
goalSchema.index({ userId: 1, isBucketList: 1 });
goalSchema.index(
  { userId: 1, templateKey: 1 },
  { unique: true, partialFilterExpression: { templateKey: { $exists: true } } },
);
goalSchema.index({ title: 'text', description: 'text' }, { userId: 1 });

module.exports = mongoose.model('Goal', goalSchema);
module.exports.GOAL_TYPES = GOAL_TYPES;
module.exports.GOAL_STATUSES = GOAL_STATUSES;
