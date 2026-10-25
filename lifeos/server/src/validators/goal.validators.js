'use strict';

const { z } = require('zod');
const { GOAL_TYPES, GOAL_STATUSES } = require('../models/Goal');
const { hexId, dateField } = require('./life.validators');

const optionalDate = dateField.optional();
const nullableDate = dateField.nullable().optional();

const goalTypeEnum = z.enum(GOAL_TYPES);
const goalStatusEnum = z.enum(GOAL_STATUSES);

const successMetricSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    unit: z.string().max(20).optional(),
    current: z.coerce.number().min(-1e9).max(1e9).optional(),
    target: z.coerce.number().min(-1e9).max(1e9),
  })
  .strict();

const okrKeyResultSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    unit: z.string().max(20).optional(),
    current: z.coerce.number().min(-1e9).max(1e9).optional(),
    target: z.coerce.number().min(-1e9).max(1e9),
  })
  .strict();

const smartItemSchema = z
  .object({ text: z.string().trim().min(1).max(300), checked: z.boolean().default(false) })
  .strict();

const obstaclesItemSchema = z
  .object({
    obstacle: z.string().trim().min(1).max(400),
    solution: z.string().max(400).default(''),
  })
  .strict();

// Fields shared by create and update (update marks everything optional).
const goalCoreFields = {
  areaId: hexId,
  type: goalTypeEnum,
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().max(4000),
  why: z.string().max(2000),
  startDate: optionalDate,
  targetDate: nullableDate,
  status: goalStatusEnum,
  importance: z.coerce.number().int().min(1).max(5),
  urgency: z.coerce.number().int().min(1).max(5),
  effort: z.coerce.number().int().min(1).max(5),
  impact: z.coerce.number().int().min(1).max(5),
  moscow: z.enum(['must', 'should', 'could', 'wont']).nullable(),
  weight: z.coerce.number().int().min(1).max(100),
  smartChecklist: z.array(smartItemSchema).max(20),
  successMetrics: z.array(successMetricSchema).max(20),
  obstaclesSolutions: z.array(obstaclesItemSchema).max(20),
  okrKeyResults: z.array(okrKeyResultSchema).max(10),
  manualProgress: z.coerce.number().min(0).max(100),
  coverUploadId: hexId.nullable(),
  isBucketList: z.boolean(),
  archived: z.boolean(),
};

// Build optional variants of a fields object.
const optionalize = (fields) => {
  const out = {};
  for (const [k, schema] of Object.entries(fields)) out[k] = schema.optional();
  return out;
};

const goalCreateInput = {
  ...goalCoreFields,
};

const goalCreateSchema = z
  .object({
    areaId: goalCoreFields.areaId,
    title: goalCoreFields.title,
    type: goalCoreFields.type.optional(),
    description: goalCoreFields.description.optional(),
    why: goalCoreFields.why.optional(),
    startDate: goalCoreFields.startDate,
    targetDate: goalCoreFields.targetDate,
    status: goalCoreFields.status.optional(),
    importance: goalCoreFields.importance.optional(),
    urgency: goalCoreFields.urgency.optional(),
    effort: goalCoreFields.effort.optional(),
    impact: goalCoreFields.impact.optional(),
    moscow: goalCoreFields.moscow.optional(),
    weight: goalCoreFields.weight.optional(),
    smartChecklist: goalCoreFields.smartChecklist.optional(),
    successMetrics: goalCoreFields.successMetrics.optional(),
    obstaclesSolutions: goalCoreFields.obstaclesSolutions.optional(),
    okrKeyResults: goalCoreFields.okrKeyResults.optional(),
    coverUploadId: goalCoreFields.coverUploadId.optional(),
    isBucketList: goalCoreFields.isBucketList.optional(),
  })
  .strict({ message: 'Unknown goal field — computed fields (progress, priority) are set by the server.' });

const goalUpdateSchema = z
  .object({
    ...optionalize({
      areaId: goalCoreFields.areaId,
      title: goalCoreFields.title,
      type: goalCoreFields.type,
      description: goalCoreFields.description,
      why: goalCoreFields.why,
      startDate: goalCoreFields.startDate,
      targetDate: goalCoreFields.targetDate,
      status: goalCoreFields.status,
      importance: goalCoreFields.importance,
      urgency: goalCoreFields.urgency,
      effort: goalCoreFields.effort,
      impact: goalCoreFields.impact,
      moscow: goalCoreFields.moscow,
      weight: goalCoreFields.weight,
      smartChecklist: goalCoreFields.smartChecklist,
      successMetrics: goalCoreFields.successMetrics,
      obstaclesSolutions: goalCoreFields.obstaclesSolutions,
      okrKeyResults: goalCoreFields.okrKeyResults,
      manualProgress: goalCoreFields.manualProgress,
      coverUploadId: goalCoreFields.coverUploadId,
      isBucketList: goalCoreFields.isBucketList,
      archived: goalCoreFields.archived,
    }),
  })
  .strict({ message: 'Unknown goal field — computed fields (progress, priority) are set by the server.' });

const goalIdParamsSchema = z.object({ goalId: hexId }).strict();
const milestoneParamsSchema = z.object({ goalId: hexId, id: hexId }).strict();

const milestoneCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(1000).optional(),
    dueDate: nullableDate,
    reward: z.string().max(200).optional(),
  })
  .strict();

const milestoneUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(1000).optional(),
    dueDate: nullableDate,
    status: z.enum(['todo', 'done']).optional(),
    reward: z.string().max(200).optional(),
  })
  .strict();

const milestoneReorderSchema = z.object({ order: z.array(hexId).min(1).max(50) }).strict();

const riskCreateSchema = z
  .object({
    risk: z.string().trim().min(1).max(300),
    probability: z.coerce.number().int().min(1).max(5).optional(),
    impact: z.coerce.number().int().min(1).max(5).optional(),
    backupPlan: z.string().max(400).optional(),
  })
  .strict();

const riskUpdateSchema = riskCreateSchema.partial();

const riskIndexParamsSchema = z.object({ goalId: hexId, index: z.coerce.number().int().min(0).max(49) }).strict();

const dependencyAddSchema = z.object({ depId: hexId }).strict();

const goalDependencyParamsSchema = z.object({ goalId: hexId, depId: hexId }).strict();

const templateCreateSchema = z
  .object({ templateKey: z.string().trim().max(60).optional() })
  .strict({ message: 'Optional templateKey only — everything else is copied from the goal.' });

const templateApplySchema = z
  .object({
    areaId: hexId,
    title: z.string().trim().min(1).max(160).optional(),
    startDate: optionalDate,
    targetDate: nullableDate,
  })
  .strict();

const templateKeyParamsSchema = z.object({ key: z.string().trim().min(1).max(60) }).strict();

// GET /goals query — maps to filters in the service (wildcard 'view' semantics).
const goalListQuerySchema = z.object({
  view: z
    .enum(['all', 'active', 'in-progress', 'idea', 'planned', 'paused', 'completed', 'dropped', 'failed', 'archived', 'bucket', 'okr'])
    .optional(),
  areaId: hexId.optional(),
  type: goalTypeEnum.optional(),
  status: goalStatusEnum.optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(['priority', 'target', 'created', 'progress', 'alpha']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  goalTypeEnum,
  goalStatusEnum,
  successMetricSchema,
  okrKeyResultSchema,
  goalCreateSchema,
  goalUpdateSchema,
  goalIdParamsSchema,
  milestoneParamsSchema,
  milestoneCreateSchema,
  milestoneUpdateSchema,
  milestoneReorderSchema,
  riskCreateSchema,
  riskUpdateSchema,
  riskIndexParamsSchema,
  dependencyAddSchema,
  goalDependencyParamsSchema,
  templateCreateSchema,
  templateApplySchema,
  templateKeyParamsSchema,
  goalListQuerySchema,
};
