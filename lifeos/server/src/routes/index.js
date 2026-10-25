'use strict';

const router = require('express').Router();

// Phase 2
router.use('/', require('./life.routes')); // /life-areas, /vision, /decisions
router.use('/goals', require('./goal.routes'));
router.use('/goal-templates', require('./goalTemplate.routes'));
router.use('/uploads', require('./upload.routes'));

// Phase 1
router.use('/auth', require('./auth.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/', require('./meta.routes'));

module.exports = router;
