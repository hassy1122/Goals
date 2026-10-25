'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { listQuerySchema, idParamsSchema } = require('../validators/notification.validators');
const ctrl = require('../controllers/notification.controller');

router.get('/', requireAuth, validate({ query: listQuerySchema }), ctrl.list);
router.post('/read-all', requireAuth, ctrl.readAll);
router.patch('/:id/read', requireAuth, validate({ params: idParamsSchema }), ctrl.read);

module.exports = router;
