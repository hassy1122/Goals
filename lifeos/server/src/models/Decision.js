'use strict';

const mongoose = require('mongoose');

// Structured decision-making (planning wizards feature): options with pros/cons,
// an impact/effort read on each option, and the finally recorded choice.
const decisionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, default: '', maxlength: 2000 },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'LifeArea', default: null },
    status: { type: String, enum: ['open', 'decided', 'dropped'], default: 'open' },
    options: [
      {
        title: { type: String, required: true, maxlength: 200 },
        notes: { type: String, default: '', maxlength: 1000 },
        pros: [{ type: String, maxlength: 300 }],
        cons: [{ type: String, maxlength: 300 }],
        impact: { type: Number, min: 1, max: 5, default: 3 },
        effort: { type: Number, min: 1, max: 5, default: 3 },
      },
    ],
    // Impact vs Effort on a choice override; refined judgment call lives here.
    chosenOptionIndex: { type: Number, min: 0, default: null },
    whatIfScenario: { type: String, default: '', maxlength: 2000 },
    // 10 minutes of judgement, 10 years of consequences — a "pre-mortem" note.
    preMortem: { type: String, default: '', maxlength: 2000 },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

decisionSchema.index({ userId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('Decision', decisionSchema);
