'use strict';

function parsePageParams({ page = '1', limit = '20' } = {}) {
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

async function paginate(model, filter, { page = 1, limit = 20, sort = '-createdAt', select = '' } = {}) {
  const { page: p, limit: l, skip } = parsePageParams({ page, limit });
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(l).select(select).lean(),
    model.countDocuments(filter),
  ]);
  return { items, page: p, limit: l, total, pages: Math.max(1, Math.ceil(total / l)) };
}

module.exports = { paginate, parsePageParams };
