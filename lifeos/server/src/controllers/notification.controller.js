'use strict';

const notificationService = require('../services/notification.service');

const ok = (res, data) => res.json({ success: true, data });

exports.list = async (req, res, next) => {
  try {
    const { items, page, limit, total, pages } = await notificationService.list(req.user._id, req.query);
    ok(res, { notifications: items, page, limit, total, pages });
  } catch (err) {
    next(err);
  }
};

exports.read = async (req, res, next) => {
  try {
    ok(res, { notification: await notificationService.markRead(req.user._id, req.params.id) });
  } catch (err) {
    next(err);
  }
};

exports.readAll = async (req, res, next) => {
  try {
    ok(res, await notificationService.markAllRead(req.user._id));
  } catch (err) {
    next(err);
  }
};
