'use strict';

const userService = require('../services/user.service');
const tokenService = require('../services/token.service');
const mailService = require('../services/mail.service');
const { setAuthCookies, clearAuthCookies, COOKIE } = require('../utils/jwt');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { user, verifyToken } = await userService.registerUser({ name, email, password });
    // Fire-and-forget: SMTP problems must never block registration.
    mailService.sendVerificationEmail({ email: user.email, name: user.name, token: verifyToken }).catch(() => {});

    const session = await tokenService.issueSession(user, req);
    setAuthCookies(res, session);
    ok(res, { user: user.toSafeJSON() }, 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await userService.authenticate({ email, password });
    const session = await tokenService.issueSession(user, req);
    setAuthCookies(res, session);
    ok(res, { user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE.REFRESH];
    const { user, session } = await tokenService.rotateRefresh(raw, req);
    setAuthCookies(res, session);
    ok(res, { user: user.toSafeJSON() });
  } catch (err) {
    clearAuthCookies(res); // dead or recycled refresh cookie → drop it either way
    next(err);
  }
};

// Unauthenticated by design: it only burns the refresh cookie it holds.
exports.logout = async (req, res, next) => {
  try {
    await tokenService.revokeRefresh(req.cookies?.[COOKIE.REFRESH]);
    clearAuthCookies(res);
    ok(res, { signedOut: true });
  } catch (err) {
    next(err);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    await tokenService.revokeAllForUser(req.user._id);
    clearAuthCookies(res);
    ok(res, { signedOut: true });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const { userId } = await tokenService.consumeSingleUseToken(token, 'verify-email');
    await userService.setEmailVerified(userId);
    ok(res, { verified: true });
  } catch (err) {
    next(err);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    await tokenService.clearSingleUseTokens(req.user._id, 'verify-email');
    const raw = await tokenService.createSingleUseToken(req.user._id, 'verify-email', 60 * 60 * 24);
    mailService.sendVerificationEmail({ email: req.user.email, name: req.user.name, token: raw }).catch(() => {});
    ok(res, { sent: true });
  } catch (err) {
    next(err);
  }
};

// Always returns success so the endpoint cannot reveal whether the email exists.
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    try {
      const result = await userService.sendPasswordReset(email);
      if (result) {
        mailService
          .sendPasswordResetEmail({ email: result.user.email, name: result.user.name, token: result.resetToken })
          .catch(() => {});
      }
    } catch (innerErr) {
      console.error('[auth] forgot-password failed:', innerErr.message);
    }
    ok(res, { sent: true });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await userService.resetPasswordWithToken(token, password);
    clearAuthCookies(res);
    ok(res, { reset: true });
  } catch (err) {
    next(err);
  }
};

exports.me = (req, res) => ok(res, { user: req.user.toSafeJSON() });

exports.updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    ok(res, { user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await userService.changePassword(req.user._id, currentPassword, newPassword);
    const session = await tokenService.issueSession(user, req);
    setAuthCookies(res, session);
    ok(res, { changed: true });
  } catch (err) {
    next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const user = await userService.updatePreferences(req.user._id, req.body);
    ok(res, { user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    const { password } = req.body;
    await userService.deleteAccount(req.user._id, password);
    clearAuthCookies(res);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
};
