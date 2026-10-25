'use strict';

const User = require('../models/User');
const userService = require('../services/user.service');
const tokenService = require('../services/token.service');
const notificationService = require('../services/notification.service');
const { paginate } = require('../utils/paginate');
const { notFound, badRequest } = require('../utils/apiError');

const ok = (res, data) => res.json({ success: true, data });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.listUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = q ? { email: { $regex: escapeRegex(q), $options: 'i' } } : {};
    const { items, page, limit, total, pages } = await paginate(User, filter, {
      page: req.query.page,
      limit: req.query.limit,
      select: '-passwordHash -privacy.appLockPinHash',
    });
    ok(res, { users: items, page, limit, total, pages });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { role, disabled } = req.body;
    const target = await User.findById(req.params.id);
    if (!target || target.deletedAt) throw notFound('User not found.', 'NOT_FOUND');

    if (role && role !== target.role) {
      if (target.role === 'admin' && role === 'user') {
        const otherAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: target._id } });
        if (otherAdmins === 0) throw badRequest('You cannot remove the last admin.', 'LAST_ADMIN');
      }
      target.role = role;
    }

    if (disabled !== undefined && disabled !== target.disabled) {
      target.disabled = disabled;
      if (disabled) {
        await tokenService.revokeAllForUser(target._id);
        notificationService
          .create(target._id, {
            kind: 'system',
            title: 'Your account was disabled',
            body: 'Contact support if you believe this is a mistake.',
          })
          .catch(() => {});
      }
    }

    await target.save();
    ok(res, { user: target.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};
