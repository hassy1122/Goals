'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const lifeValidators = require('../validators/life.validators');
const ctrl = require('../controllers/life.controller');

// NOTE: this router is mounted at '/' — requireAuth must stay per-route,
// never a blanket use() that would block public /auth endpoints.

// ---------- Life areas ----------
router.get('/life-areas', requireAuth, ctrl.listAreas);
router.post('/life-areas', requireAuth, validate({ body: lifeValidators.areaCreateSchema }), ctrl.createArea);
router.post('/life-areas/reorder', requireAuth, validate({ body: lifeValidators.areaReorderSchema }), ctrl.reorderAreas);
router.get('/life-areas/wheel', requireAuth, ctrl.getWheel);
router.patch('/life-areas/:id', requireAuth, validate({ params: lifeValidators.areaIdParamsSchema, body: lifeValidators.areaUpdateSchema }), ctrl.updateArea);
router.delete('/life-areas/:id', requireAuth, validate({ params: lifeValidators.areaIdParamsSchema }), ctrl.deleteArea);
router.post(
  '/life-areas/:id/assessments',
  requireAuth,
  validate({ params: lifeValidators.areaIdParamsSchema, body: lifeValidators.assessCreateSchema }),
  ctrl.assessArea,
);

const assessmentListQuery = require('zod').object({
  page: require('zod').string().optional(),
  limit: require('zod').string().optional(),
});
router.get(
  '/life-areas/:id/assessments',
  requireAuth,
  validate({ params: lifeValidators.areaIdParamsSchema, query: assessmentListQuery }),
  ctrl.listAssessments,
);

// ---------- Vision ----------
router.get('/vision', requireAuth, ctrl.visionGet);
router.patch('/vision', requireAuth, validate({ body: lifeValidators.visionUpdateSchema }), ctrl.visionUpdate);
router.post('/vision/board', requireAuth, validate({ body: lifeValidators.boardImageAddSchema }), ctrl.addBoardImage);
router.patch('/vision/board', requireAuth, validate({ body: lifeValidators.boardReorderSchema }), ctrl.reorderBoard);
router.delete('/vision/board/:imageId', requireAuth, validate({ params: lifeValidators.boardImageParamsSchema }), ctrl.removeBoardImage);

// ---------- Decisions ----------
const decisionsQuery = require('zod')
  .object({
    status: require('zod').enum(['open', 'decided', 'dropped']).optional(),
    page: require('zod').string().optional(),
    limit: require('zod').string().optional(),
  });
router.get('/decisions', requireAuth, validate({ query: decisionsQuery }), ctrl.listDecisions);
router.post('/decisions', requireAuth, validate({ body: lifeValidators.decisionCreateSchema }), ctrl.createDecision);
router.patch(
  '/decisions/:id',
  requireAuth,
  validate({ params: lifeValidators.decisionIdParamsSchema, body: lifeValidators.decisionUpdateSchema }),
  ctrl.updateDecision,
);
router.delete('/decisions/:id', requireAuth, validate({ params: lifeValidators.decisionIdParamsSchema }), ctrl.deleteDecision);

module.exports = router;
