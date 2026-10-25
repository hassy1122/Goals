'use strict';

const mongoose = require('mongoose');

const visionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    statement: { type: String, default: '', maxlength: 2000 },
    coreValues: [{ type: String, trim: true, maxlength: 60 }],
    affirmations: [{ type: String, maxlength: 200 }],
    yearTheme: {
      year: { type: Number, default: null },
      title: { type: String, default: '', maxlength: 120 },
      why: { type: String, default: '', maxlength: 1000 },
    },
    // Life Roadmap: 1 / 3 / 5 / 10-year horizons.
    roadmap: [
      {
        horizon: { type: Number, enum: [1, 3, 5, 10], required: true },
        title: { type: String, required: true, maxlength: 160 },
        notes: { type: String, default: '', maxlength: 1000 },
      },
    ],
    ikigai: {
      loves: { type: String, default: '', maxlength: 1000 },
      excels: { type: String, default: '', maxlength: 1000 },
      worldNeeds: { type: String, default: '', maxlength: 1000 },
      paidFor: { type: String, default: '', maxlength: 1000 },
      summary: { type: String, default: '', maxlength: 1000 },
    },
    // Annual "Wheel of Life" worksheet reflection.
    wheelReflection: { type: String, default: '', maxlength: 2000 },
    boardImages: [
      {
        uploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
        caption: { type: String, default: '', maxlength: 160 },
        order: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Vision', visionSchema);
