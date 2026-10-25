'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE = { ACCESS: 'lifeos_at', REFRESH: 'lifeos_rt' };

function parseTtlMs(ttl) {
  const m = /^(\d+)([smhd])$/.exec(String(ttl).trim());
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[m[2]];
  return n * unit;
}

function signAccessToken(userId, role) {
  return jwt.sign({ sub: String(userId), role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: 'lifeos',
  });
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'lifeos' });
  if (!payload.sub || !['user', 'admin'].includes(payload.role)) {
    const err = new Error('Invalid token payload');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return payload;
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
  };
}

function setAuthCookies(res, { accessToken, refreshToken, refreshDays }) {
  res.cookie(COOKIE.ACCESS, accessToken, { ...cookieBase(), maxAge: parseTtlMs(env.JWT_ACCESS_TTL) });
  const days = refreshDays || env.REFRESH_TOKEN_TTL_DAYS;
  res.cookie(COOKIE.REFRESH, refreshToken, {
    ...cookieBase(),
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(COOKIE.ACCESS, cookieBase());
  res.clearCookie(COOKIE.REFRESH, cookieBase());
}

module.exports = { COOKIE, setAuthCookies, clearAuthCookies, signAccessToken, verifyAccessToken, parseTtlMs };
