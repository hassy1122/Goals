'use strict';

const mongoose = require('mongoose');

// Self-assessments score a life area 1..10 and drive the Balance Wheel over time.
const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'LifeArea', required: true },
    date: { type: Date, default: Date.now },
    score: { type: Number, required: true, min: 1, max: 10 },
    answers: [
      { question: { type: String, maxlength: 200 }, value: { type: Number, min: 1, max: 10 } },
    ],
    note: { type: String, default: '', maxlength: 1000 },
    source: { type: String, enum: ['manual', 'onboarding', 'review'], default: 'manual' },
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, areaId: 1, date: -1 });
assessmentSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
