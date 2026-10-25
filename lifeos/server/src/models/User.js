'use strict';

const mongoose = require('mongoose');
const { verifyPassword } = require('../utils/crypto');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    disabled: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, trim: true, default: '' },
    timezone: { type: String, trim: true, default: 'UTC', maxlength: 64 },
    locale: { type: String, trim: true, default: 'en', maxlength: 10 },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    onboarding: {
      done: { type: Boolean, default: false },
      step: { type: Number, default: 0 },
    },
    prefs: {
      weekStartsOn: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6], default: 1 },
      currency: { type: String, default: 'USD', maxlength: 3 },
      themeColor: { type: String, default: 'indigo', maxlength: 24 },
      dashboardLayout: [
        new mongoose.Schema(
          {
            widgetId: { type: String, required: true, maxlength: 40 },
            order: { type: Number, default: 0 },
            hidden: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      savedViews: [
        new mongoose.Schema(
          {
            name: { type: String, required: true, maxlength: 40 },
            entity: { type: String, required: true },
            filters: { type: Object, default: {} },
            sort: {
              field: { type: String, default: '' },
              dir: { type: String, enum: ['asc', 'desc'], default: 'desc' },
            },
          },
          { _id: false },
        ),
      ],
    },
    notifPrefs: {
      digestHour: { type: Number, min: 0, max: 23, default: 8 },
      channels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        from: { type: String, default: '22:00' },
        to: { type: String, default: '07:00' },
      },
      kinds: {
        taskReminder: { type: Boolean, default: true },
        habitReminder: { type: Boolean, default: true },
        goalDeadline: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: true },
        weeklyPriorities: { type: Boolean, default: true },
        digest: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
      },
    },
    privacy: {
      appLockEnabled: { type: Boolean, default: false },
      appLockPinHash: { type: String, select: false, default: '' },
      e2eeJournal: {
        enabled: { type: Boolean, default: false },
        hint: { type: String, default: '', maxlength: 120 },
      },
    },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1 },
    badges: [{ key: { type: String, maxlength: 40 }, unlockedAt: Date }],
    streaks: {
      dailyEngagement: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

userSchema.methods.comparePassword = function comparePassword(plain) {
  return verifyPassword(plain, this.passwordHash);
};

// Response-safe projection: sensitive fields are never serialized.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  if (obj.privacy) delete obj.privacy.appLockPinHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
