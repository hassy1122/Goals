'use strict';

const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['todo', 'done'], default: 'todo' },
    reward: { type: String, default: '', maxlength: 200 },
    rewardRedeemedAt: { type: Date, default: null },

    // Denormalized task rollups (filled from Phase 3).
    tasksDone: { type: Number, default: 0 },
    tasksTotal: { type: Number, default: 0 },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true },
);

milestoneSchema.index({ userId: 1, goalId: 1, order: 1 });
milestoneSchema.index({ userId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);
