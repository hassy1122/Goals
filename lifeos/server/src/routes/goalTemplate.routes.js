'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const v = require('../validators/goal.validators');
const ctrl = require('../controllers/goalTemplate.controller');

router.use(requireAuth);

// GET /api/v1/goal-templates → { system: [...], custom: [...] }
router.get('/', ctrl.list);

// POST /api/v1/goal-templates/:key/apply → creates a planned goal from a template.
router.post(
  '/:key/apply',
  validate({ params: v.templateKeyParamsSchema, body: v.templateApplySchema }),
  ctrl.apply,
);

module.exports = router;
