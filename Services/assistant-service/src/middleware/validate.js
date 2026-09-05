import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new AppError(`Validation failed: ${details.map((d) => `${d.field} — ${d.message}`).join('; ')}`, BAD_REQUEST));
    }
    req.body = result.data;
    next();
  };
}

