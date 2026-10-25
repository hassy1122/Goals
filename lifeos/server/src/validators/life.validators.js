'use strict';

const { z } = require('zod');

const hexId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const dateField = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');
const optionalDate = dateField.optional();

// ---------- Life areas ----------

const areaCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(40),
    key: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Use letters, numbers and dashes')
      .max(40)
      .optional(),
    icon: z.string().trim().max(8).optional(),
    color: z.string().trim().max(16).optional(),
    targetScore: z.coerce.number().int().min(1).max(10).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const areaUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    icon: z.string().trim().max(8).optional(),
    color: z.string().trim().max(16).optional(),
    targetScore: z.coerce.number().int().min(1).max(10).optional(),
    notes: z.string().max(2000).optional(),
    archived: z.boolean().optional(),
  })
  .strict();

const areaReorderSchema = z.object({ order: z.array(hexId).min(1).max(50) }).strict();

const areaIdParamsSchema = z.object({ id: hexId }).strict();

// Self-assessment (source is set server-side).
const assessCreateSchema = z
  .object({
    score: z.coerce.number().min(1).max(10),
    answers: z
      .array(
        z
          .object({
            question: z.string().max(200),
            value: z.coerce.number().min(1).max(10),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    note: z.string().max(1000).optional(),
  })
  .strict();

// ---------- Vision ----------

const visionUpdateSchema = z
  .object({
    statement: z.string().max(2000).optional(),
    coreValues: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    affirmations: z.array(z.string().min(1).max(200)).max(50).optional(),
    yearTheme: z
      .object({
        year: z.coerce.number().int().min(1900).max(2200).nullable().optional(),
        title: z.string().max(120).optional(),
        why: z.string().max(1000).optional(),
      })
      .strict()
      .optional(),
    roadmap: z
      .array(
        z
          .object({
            horizon: z.coerce.number().refine((n) => [1, 3, 5, 10].includes(n), 'Horizon must be 1, 3, 5 or 10'),
            title: z.string().min(1).max(160),
            notes: z.string().max(1000).optional(),
          })
          .strict(),
      )
      .max(4)
      .optional(),
    ikigai: z
      .object({
        loves: z.string().max(1000).optional(),
        excels: z.string().max(1000).optional(),
        worldNeeds: z.string().max(1000).optional(),
        paidFor: z.string().max(1000).optional(),
        summary: z.string().max(1000).optional(),
      })
      .strict()
      .optional(),
    wheelReflection: z.string().max(2000).optional(),
  })
  .strict();

const boardImageAddSchema = z
  .object({ uploadId: hexId, caption: z.string().max(160).optional(), order: z.coerce.number().int().min(0).optional() })
  .strict();

const boardImageParamsSchema = z.object({ imageId: hexId }).strict();

const boardReorderSchema = z.object({ order: z.array(hexId).min(1).max(60) }).strict();

// ---------- Decisions ----------

const decisionOptionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().max(1000).optional(),
    pros: z.array(z.string().min(1).max(300)).max(20).optional(),
    cons: z.array(z.string().min(1).max(300)).max(20).optional(),
    impact: z.coerce.number().int().min(1).max(5).optional(),
    effort: z.coerce.number().int().min(1).max(5).optional(),
  })
  .strict();

const decisionCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().max(2000).optional(),
    areaId: hexId.nullable().optional(),
    options: z.array(decisionOptionSchema).max(8).optional(),
  })
  .strict();

const decisionUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().max(2000).optional(),
    areaId: hexId.nullable().optional(),
    status: z.enum(['open', 'decided', 'dropped']).optional(),
    options: z.array(decisionOptionSchema).max(8).optional(),
    chosenOptionIndex: z.coerce.number().int().min(0).max(7).nullable().optional(),
    whatIfScenario: z.string().max(2000).optional(),
    preMortem: z.string().max(2000).optional(),
    decidedAt: optionalDate.nullable(),
  })
  .strict();

const decisionIdParamsSchema = z.object({ id: hexId }).strict();

// ---------- Onboarding ----------

const onboardingCompleteSchema = z
  .object({
    areas: z
      .array(
        z.object({ areaId: hexId, targetScore: z.coerce.number().int().min(1).max(10) }).strict(),
      )
      .min(1, 'Pick at least one area to target')
      .max(20)
      .optional(),
    statement: z.string().min(1, 'Describe your vision in a sentence at least').max(2000).optional(),
    coreValues: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
    firstGoal: z
      .object({
        areaId: hexId,
        title: z.string().trim().min(1).max(160),
        targetDate: optionalDate,
      })
      .strict()
      .optional(),
  })
  .strict();

module.exports = {
  hexId,
  dateField,
  areaCreateSchema,
  areaUpdateSchema,
  areaReorderSchema,
  areaIdParamsSchema,
  assessCreateSchema,
  visionUpdateSchema,
  boardImageAddSchema,
  boardImageParamsSchema,
  boardReorderSchema,
  decisionCreateSchema,
  decisionUpdateSchema,
  decisionIdParamsSchema,
  onboardingCompleteSchema,
};
