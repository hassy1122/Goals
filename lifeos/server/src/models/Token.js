'use strict';

const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['refresh', 'verify-email', 'reset-password'], required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 250 },
  },
  { timestamps: true },
);

tokenSchema.index({ tokenHash: 1 }, { unique: true });
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);
