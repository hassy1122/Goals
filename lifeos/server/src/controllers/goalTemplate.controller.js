'use strict';

const goalService = require('../services/goal.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const uid = (req) => req.user._id.toString();

exports.list = async (req, res, next) => {
  try {
    ok(res, await goalService.listTemplates(uid(req)));
  } catch (err) {
    next(err);
  }
};

exports.apply = async (req, res, next) => {
  try {
    ok(res, await goalService.applyTemplate(uid(req), req.params.key, req.body), 201);
  } catch (err) {
    next(err);
  }
};
