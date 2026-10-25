'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { hexId } = require('../validators/life.validators');
const ctrl = require('../controllers/upload.controller');
const { uploadHandler } = ctrl;

router.use(requireAuth);

// POST /api/v1/uploads  (multipart, field name "file", ≤ 5 MB, jpeg/png/webp/pdf)
router.post('/', uploadHandler, ctrl.upload);

// Owner-guarded streaming — deliberately NOT static-mounted.
router.get('/:id', validate({ params: require('zod').object({ id: hexId }).strict() }), ctrl.stream);
router.delete('/:id', validate({ params: require('zod').object({ id: hexId }).strict() }), ctrl.destroy);

module.exports = router;
