'use strict';

const router = require('express').Router();
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { createRateLimiters } = require('../middlewares/rateLimit');
const v = require('../validators/auth.validators');
const lifeValidators = require('../validators/life.validators');
const ctrl = require('../controllers/auth.controller');
const lifeCtrl = require('../controllers/life.controller');

const { authLimiter } = createRateLimiters();

// Public — strict limiter on credential & token endpoints.
router.post('/register', authLimiter, validate({ body: v.registerSchema }), ctrl.register);
router.post('/login', authLimiter, validate({ body: v.loginSchema }), ctrl.login);
router.post('/verify-email', validate({ body: v.verifyEmailSchema }), ctrl.verifyEmail);
router.post('/forgot-password', authLimiter, validate({ body: v.forgotPasswordSchema }), ctrl.forgotPassword);
router.post('/reset-password', validate({ body: v.resetPasswordSchema }), ctrl.resetPassword);

// Cookie-driven rotation (deliberately generous rate limit; reuse is detected server-side).
router.post('/refresh', ctrl.refresh);

// Authenticated account endpoints.
router.post('/resend-verification', requireAuth, ctrl.resendVerification);
router.post('/logout-all', requireAuth, ctrl.logoutAll);
router.get('/me', requireAuth, ctrl.me);
router.patch('/me', requireAuth, validate({ body: v.updateMeSchema }), ctrl.updateMe);
router.patch('/me/password', requireAuth, validate({ body: v.changePasswordSchema }), ctrl.changePassword);
router.patch('/me/preferences', requireAuth, validate({ body: v.prefsUpdateSchema }), ctrl.updatePreferences);
router.delete('/me', requireAuth, validate({ body: v.deleteMeSchema }), ctrl.deleteMe);
// Onboarding wizard completion (sets user.onboarding.done; creates vision/first goal).
router.post('/me/onboarding/complete', requireAuth, validate({ body: lifeValidators.onboardingCompleteSchema }), lifeCtrl.onboardingComplete);
router.post('/logout', ctrl.logout); // no requireAuth: logout must work even with a dead access token

module.exports = router;
