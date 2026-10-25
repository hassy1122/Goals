'use strict';

const routerWrap = require('express').Router;
const router = routerWrap();
const env = require('../config/env');
const { dailyQuote } = require('../utils/quotes');

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() } });
});

router.get('/quotes/daily', (_req, res) => {
  res.json({ success: true, data: dailyQuote() });
});

module.exports = router;
