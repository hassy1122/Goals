'use strict';

const Notification = require('../models/Notification');
const { paginate } = require('../utils/paginate');
const { notFound } = require('../utils/apiError');

async function list(userId, { unread, page, limit }) {
  const filter = { userId };
  if (unread === 'true') filter.readAt = null;
  return paginate(Notification, filter, { page, limit, sort: '-createdAt' });
}

async function create(userId, entry = {}) {
  const { kind = 'system', title, body = '', entityType = '', entityId = null, actionUrl = '', dedupeKey = '', scheduledFor = null } = entry;
  if (dedupeKey) {
    return Notification.findOneAndUpdate(
      { userId, dedupeKey },
      { $setOnInsert: { userId, kind, title, body, entityType, entityId, actionUrl, scheduledFor } },
      { new: true, upsert: true },
    );
  }
  return Notification.create({ userId, kind, title, body, entityType, entityId, actionUrl, scheduledFor });
}

async function countUnread(userId) {
  return Notification.countDocuments({ userId, readAt: null });
}

async function markRead(userId, id) {
  const doc = await Notification.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true });
  if (!doc) throw notFound('Notification not found.', 'NOT_FOUND');
  return doc;
}

async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
  return { modified: result.modifiedCount };
}

module.exports = { list, create, countUnread, markRead, markAllRead };
