'use strict';

const User = require('../models/User');
const LifeArea = require('../models/LifeArea');
const Notification = require('../models/Notification');
const Token = require('../models/Token');
const Vision = require('../models/Vision');
const Assessment = require('../models/Assessment');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const Upload = require('../models/Upload');
const Decision = require('../models/Decision');
const tokenService = require('./token.service');
const storage = require('../utils/storage');
const { hashPassword } = require('../utils/crypto');
const {
  conflict,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
} = require('../utils/apiError');

const DEFAULT_AREAS = [
  { name: 'Health', key: 'health', icon: '💪', color: '#10b981' },
  { name: 'Career', key: 'career', icon: '💼', color: '#0ea5e9' },
  { name: 'Finance', key: 'finance', icon: '💰', color: '#f59e0b' },
  { name: 'Education', key: 'education', icon: '🎓', color: '#6366f1' },
  { name: 'Relationships', key: 'relationships', icon: '🤝', color: '#ec4899' },
  { name: 'Family', key: 'family', icon: '🏡', color: '#f43f5e' },
  { name: 'Personal Growth', key: 'personal-growth', icon: '🌱', color: '#8b5cf6' },
  { name: 'Spirituality', key: 'spirituality', icon: '🙏', color: '#d946ef' },
  { name: 'Fun & Hobbies', key: 'fun-hobbies', icon: '🎨', color: '#f97316' },
  { name: 'Environment', key: 'environment', icon: '🌳', color: '#84cc16' },
];

async function createDefaultAreas(userId) {
  await LifeArea.insertMany(DEFAULT_AREAS.map((area, i) => ({ ...area, userId, order: i + 1 })));
}

async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw conflict('That email is already registered.', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  await createDefaultAreas(user._id);

  const verifyToken = await tokenService.createSingleUseToken(user._id, 'verify-email', 60 * 60 * 24);
  return { user, verifyToken };
}

async function authenticate({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || user.deletedAt || !(await user.comparePassword(password))) {
    throw unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  if (user.disabled) throw forbidden('This account is disabled.', 'ACCOUNT_DISABLED');
  user.passwordHash = undefined;
  return user;
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');
  return user;
}

async function updateProfile(userId, data = {}) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');

  for (const key of ['name', 'avatarUrl', 'timezone', 'locale', 'theme']) {
    if (data[key] !== undefined) user[key] = data[key];
  }
  await user.save();
  return user;
}

// Each provided top-level section is shallow-merged; arrays (dashboardLayout, savedViews) replace as a whole.
async function updatePreferences(userId, body = {}) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');

  for (const section of ['prefs', 'notifPrefs']) {
    if (body[section]) Object.assign(user[section], body[section]);
  }

  if (body.privacy) {
    if (body.privacy.appLockPin !== undefined) {
      user.privacy.appLockPinHash = await hashPassword(body.privacy.appLockPin);
      user.privacy.appLockEnabled = body.privacy.appLockEnabled ?? true;
    } else if (body.privacy.appLockEnabled !== undefined) {
      user.privacy.appLockEnabled = body.privacy.appLockEnabled;
    }
    if (body.privacy.e2eeJournal) {
      Object.assign(user.privacy.e2eeJournal, body.privacy.e2eeJournal);
    }
  }

  await user.save();
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');
  if (!(await user.comparePassword(currentPassword))) {
    throw unauthorized('Current password is incorrect.', 'INVALID_CREDENTIALS');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await tokenService.revokeAllForUser(userId);
  return user;
}

// Returns null quietly when the email does not exist (public endpoint must not leak existence).
async function sendPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user || user.disabled) return null;
  const resetToken = await tokenService.createSingleUseToken(user._id, 'reset-password', 60 * 60);
  return { user, resetToken };
}

async function resetPasswordWithToken(rawToken, newPassword) {
  const { userId } = await tokenService.consumeSingleUseToken(rawToken, 'reset-password');
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await tokenService.revokeAllForUser(userId);
  return user;
}

async function setEmailVerified(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found.', 'ACCOUNT_GONE');
  user.emailVerified = true;
  await user.save();
  return user;
}

async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || user.deletedAt) throw notFound('Account not found.', 'ACCOUNT_GONE');
  if (!(await user.comparePassword(password))) {
    throw unauthorized('Password is incorrect.', 'INVALID_CREDENTIALS');
  }

  // Cascade (Phase 2): vision, assessments, goals, milestones, decisions; uploads also purge files from disk.
  const uploads = await Upload.find({ userId }).select('storageKey').lean();
  await Promise.all([
    User.deleteOne({ _id: userId }),
    Token.deleteMany({ userId }),
    LifeArea.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Vision.deleteMany({ userId }),
    Assessment.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Milestone.deleteMany({ userId }),
    Decision.deleteMany({ userId }),
    Upload.deleteMany({ userId }),
    ...uploads.map((u) => storage.deleteObject(u.storageKey)),
  ]);
}

module.exports = {
  DEFAULT_AREAS,
  registerUser,
  createDefaultAreas,
  authenticate,
  getMe,
  updateProfile,
  updatePreferences,
  changePassword,
  sendPasswordReset,
  resetPasswordWithToken,
  setEmailVerified,
  deleteAccount,
};
