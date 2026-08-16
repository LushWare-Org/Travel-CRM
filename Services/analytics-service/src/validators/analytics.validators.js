import { z } from 'zod';
import { TIME_RANGES } from '../utils/timeRange.js';

export const overviewQuerySchema = z.object({
  timeRange: z.enum(TIME_RANGES).optional().default('monthly'),
});

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    req.query = result.data;
    next();
  };
}
