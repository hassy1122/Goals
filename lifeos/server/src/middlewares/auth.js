'use strict';

const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/apiError');
const { COOKIE, verifyAccessToken } = require('../utils/jwt');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE.ACCESS];
    if (!token) throw unauthorized('Sign in to continue.');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized('Your session expired. Sign in again.', 'TOKEN_EXPIRED');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.deletedAt) throw unauthorized('This account no longer exists.', 'ACCOUNT_GONE');
    if (user.disabled) throw forbidden('This account is disabled.', 'ACCOUNT_DISABLED');

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) return next(forbidden(`Requires ${role} role.`, 'ROLE_REQUIRED'));
    return next();
  };
}

module.exports = { requireAuth, requireRole };
