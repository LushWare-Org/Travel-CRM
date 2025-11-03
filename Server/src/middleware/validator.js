import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

/**
 * Validation middleware for Joi schemas (body validation only)
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const formattedErrors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return next(new AppError('Validation failed', 400, formattedErrors));
  }

  // Replace request body with validated value
  req.body = value;
  return next();
};

/**
 * Validation middleware for Joi schemas with flexible request location
 * @param {Object} schema - Joi validation schema
 * @param {String} location - Where to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema, location = 'body') => (req, res, next) => {
  const dataToValidate = req[location];

  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const formattedErrors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return next(new AppError('Validation failed', 400, formattedErrors));
  }

  // Replace request data with validated value
  req[location] = value;
  return next();
};

/**
 * Validation middleware for express-validator (backward compatibility)
 * Checks for validation errors from express-validator
 */
export const validateExpressValidator = (validations) => async (req, res, next) => {
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
