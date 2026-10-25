'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const v = require('../validators/goal.validators');
const ctrl = require('../controllers/goal.controller');

router.use(requireAuth);

// ---------- Collection ----------
router.get('/', validate({ query: v.goalListQuerySchema }), ctrl.list);
router.post('/', validate({ body: v.goalCreateSchema }), ctrl.create);

// ---------- Analytics (2-segment paths, cannot collide with /:goalId) ----------
router.get('/analytics/comparison', ctrl.analyticsComparison);
router.get('/analytics/impact-effort', ctrl.analyticsImpactEffort);
router.get('/analytics/gantt', ctrl.analyticsGantt);

// ---------- Milestone reorder (literal before /:id) ----------
router.post(
  '/:goalId/milestones/reorder',
  validate({ params: v.goalIdParamsSchema, body: v.milestoneReorderSchema }),
  ctrl.reorderMilestones,
);

// ---------- Milestones ----------
router.post('/:goalId/milestones', validate({ params: v.goalIdParamsSchema, body: v.milestoneCreateSchema }), ctrl.createMilestone);
router.patch(
  '/:goalId/milestones/:id',
  validate({ params: v.milestoneParamsSchema, body: v.milestoneUpdateSchema }),
  ctrl.updateMilestone,
);
router.post(
  '/:goalId/milestones/:id/redeem',
  validate({ params: v.milestoneParamsSchema }),
  ctrl.redeemMilestone,
);
router.delete('/:goalId/milestones/:id', validate({ params: v.milestoneParamsSchema }), ctrl.deleteMilestone);

// ---------- Risks (index-addressed embedded docs) ----------
router.post('/:goalId/risks', validate({ params: v.goalIdParamsSchema, body: v.riskCreateSchema }), ctrl.addRisk);
router.patch(
  '/:goalId/risks/:index',
  validate({ params: v.riskIndexParamsSchema, body: v.riskUpdateSchema }),
  ctrl.updateRisk,
);
router.delete('/:goalId/risks/:index', validate({ params: v.riskIndexParamsSchema }), ctrl.deleteRisk);

// ---------- Dependencies ----------
router.get('/:goalId/dependencies/candidates', validate({ params: v.goalIdParamsSchema }), ctrl.dependencyCandidates);
router.post('/:goalId/dependencies', validate({ params: v.goalIdParamsSchema, body: v.dependencyAddSchema }), ctrl.addDependency);
router.delete('/:goalId/dependencies/:depId', validate({ params: v.goalDependencyParamsSchema }), ctrl.removeDependency);

// ---------- Goal item ----------
router.get('/:goalId', validate({ params: v.goalIdParamsSchema }), ctrl.get);
router.patch('/:goalId', validate({ params: v.goalIdParamsSchema, body: v.goalUpdateSchema }), ctrl.update);
router.delete('/:goalId', validate({ params: v.goalIdParamsSchema }), ctrl.delete);
router.get('/:goalId/burnup', validate({ params: v.goalIdParamsSchema }), ctrl.burnup);
router.post('/:goalId/make-template', validate({ params: v.goalIdParamsSchema, body: v.templateCreateSchema }), ctrl.makeTemplate);

module.exports = router;
