'use strict';

const mongoose = require('mongoose');

const lifeAreaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    key: { type: String, required: true, maxlength: 40 },
    icon: { type: String, default: '⭐', maxlength: 8 },
    color: { type: String, default: '#6366f1', maxlength: 16 },
    order: { type: Number, default: 0 },
    targetScore: { type: Number, min: 1, max: 10, default: 10 },
    // Denormalized: latest Assessment score (recomputed when assessments are written).
    currentScore: { type: Number, min: 0, max: 10, default: 0 },
    // Denormalized: weighted goal progress across the area (recomputed on Goal writes).
    goalScore: { type: Number, min: 0, max: 10, default: 0 },
    notes: { type: String, default: '', maxlength: 2000 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

lifeAreaSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
lifeAreaSchema.index(
  { userId: 1, key: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
lifeAreaSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('LifeArea', lifeAreaSchema);
