'use strict';

const mongoose = require('mongoose');

const NOTIFICATION_KINDS = [
  'task-reminder',
  'habit-reminder',
  'goal-deadline',
  'subscription-renewal',
  'digest',
  'weekly-nudge',
  'system',
  'share',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, default: 'system' },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, default: '', maxlength: 400 },
    entityType: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actionUrl: { type: String, default: '' },
    readAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    dedupeKey: { type: String, maxlength: 200 }, // omitted (no default) when there's no dedupe key
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ userId: 1, scheduledFor: 1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } } },
);

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_KINDS = NOTIFICATION_KINDS;
