'use strict';

const { unprocessable } = require('../utils/apiError');

// validate({paramSchema, querySchema, bodySchema}) — pure Zod; parsed values replace raw ones.
function validate(schema) {
  return (req, res, next) => {
    const issues = [];
    for (const part of ['params', 'query', 'body']) {
      const partSchema = schema[part];
      if (!partSchema) continue;

      const result = partSchema.safeParse(req[part]);
      if (result.success) {
        // Replace the raw part with the parsed/sanitized value.
        req[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ in: part, path: issue.path.join('.') || '(root)', message: issue.message });
        }
      }
    }

    if (issues.length > 0) return next(unprocessable('Validation failed.', 'VALIDATION_ERROR', issues));
    return next();
  };
}

module.exports = { validate };
