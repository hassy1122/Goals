'use strict';

const Token = require('../models/Token');
const User = require('../models/User');
const env = require('../config/env');
const { hashToken, randomToken } = require('../utils/crypto');
const { signAccessToken } = require('../utils/jwt');
const {
  unauthorized,
  forbidden,
  notFound,
  badRequest,
} = require('../utils/apiError');

const refreshExpiresAt = () => new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

async function issueSession(user, req = {}) {
  const raw = randomToken();
  await Token.create({
    userId: user._id,
    type: 'refresh',
    tokenHash: hashToken(raw),
    expiresAt: refreshExpiresAt(),
    ip: req.ip || '',
    userAgent: String(req.headers?.['user-agent'] || '').slice(0, 250),
  });
  return { accessToken: signAccessToken(user._id, user.role), refreshToken: raw };
}

// Rotates a refresh token. Reuse of a rotated token revokes every session for that user (theft guard).
async function rotateRefresh(rawRefreshToken, req = {}) {
  if (!rawRefreshToken) throw unauthorized('No refresh session.', 'NO_REFRESH');

  const doc = await Token.findOne({ tokenHash: hashToken(rawRefreshToken), type: 'refresh' });
  if (!doc) throw unauthorized('Session not found. Sign in again.', 'INVALID_REFRESH');
  if (doc.usedAt) {
    await Token.deleteMany({ userId: doc.userId, type: 'refresh' });
    throw unauthorized('Session replay detected. All sessions were revoked.', 'REFRESH_REUSED');
  }
  if (doc.expiresAt <= new Date()) throw unauthorized('Session expired. Sign in again.', 'REFRESH_EXPIRED');

  const user = await User.findById(doc.userId);
  if (!user || user.deletedAt) throw unauthorized('This account no longer exists.', 'ACCOUNT_GONE');
  if (user.disabled) throw forbidden('This account is disabled.', 'ACCOUNT_DISABLED');

  doc.usedAt = new Date();
  await doc.save();

  const session = await issueSession(user, req);
  return { user, session };
}

async function revokeRefresh(rawRefreshToken) {
  if (!rawRefreshToken) return;
  await Token.deleteOne({ tokenHash: hashToken(rawRefreshToken), type: 'refresh' });
}

async function revokeAllForUser(userId) {
  await Token.deleteMany({ userId, type: 'refresh' });
}

async function createSingleUseToken(userId, type, ttlSeconds = 60 * 60 * 24) {
  const raw = randomToken(32);
  await Token.create({
    userId,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });
  return raw;
}

async function clearSingleUseTokens(userId, type) {
  await Token.deleteMany({ userId, type });
}

// Validates and burns a verify-email / reset-password token. Returns { userId }.
async function consumeSingleUseToken(rawToken, type) {
  if (!rawToken) throw badRequest('Missing token.', 'TOKEN_MISSING');

  const doc = await Token.findOne({ tokenHash: hashToken(rawToken), type });
  if (!doc) throw notFound('This link is invalid or was already used.', 'TOKEN_INVALID');
  if (doc.usedAt) throw badRequest('This link was already used.', 'TOKEN_USED');
  if (doc.expiresAt <= new Date()) {
    throw badRequest('This link has expired. Request a new one.', 'TOKEN_EXPIRED');
  }

  doc.usedAt = new Date();
  await doc.save();
  return { userId: doc.userId.toString() };
}

module.exports = {
  issueSession,
  rotateRefresh,
  revokeRefresh,
  revokeAllForUser,
  createSingleUseToken,
  clearSingleUseTokens,
  consumeSingleUseToken,
};
