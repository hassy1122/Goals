'use strict';

const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { meIdSchema, adminUpdateUserSchema } = require('../validators/auth.validators');
const ctrl = require('../controllers/admin.controller');

router.use(requireAuth, requireRole('admin'));

router.get(
  '/users',
  validate({ query: require('zod').object({ q: require('zod').string().max(120).optional(), page: require('zod').string().optional(), limit: require('zod').string().optional() }) }),
  ctrl.listUsers,
);
router.patch('/users/:id', validate({ params: meIdSchema, body: adminUpdateUserSchema }), ctrl.updateUser);

module.exports = router;
