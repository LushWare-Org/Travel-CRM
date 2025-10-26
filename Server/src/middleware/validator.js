import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 */
export const validate = (validations) => async (req, res, next) => {
  // Execute all validations
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return next(new AppError('Validation failed', 400, formattedErrors));
  }

  return next();
};

// Default export for backward compatibility
export default (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    throw new AppError('Validation failed', 400, formattedErrors);
  }

  next();
};
