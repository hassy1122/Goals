'use strict';

const { z } = require('zod');

const listQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const idParamsSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }).strict();

module.exports = { listQuerySchema, idParamsSchema };
