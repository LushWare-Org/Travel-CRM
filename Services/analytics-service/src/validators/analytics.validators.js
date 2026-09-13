import { z } from 'zod';
import { TIME_RANGES } from '../utils/timeRange.js';
import AppError from '../utils/appError.js';

export const overviewQuerySchema = z.object({
  timeRange: z.enum(TIME_RANGES).optional().default('monthly'),
});

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      // Routed through the shared error contract rather than a hand-built body, so
      // this response carries the same code and requestId as every other service's.
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(
        new AppError('Please check the filters and try again.', 400, {
          code: 'VALIDATION_FAILED',
          errors,
        }),
      );
    }
    req.query = result.data;
    next();
  };
}
