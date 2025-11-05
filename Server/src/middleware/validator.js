import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

/**
 * Validation middleware that handles both Joi schemas and express-validator arrays
 * @param {Object|Array} schema - Joi validation schema or express-validator array
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  // Check if it's an express-validator array (array of functions)
  if (Array.isArray(schema) && schema.length > 0 && typeof schema[0] === 'function') {
    // Handle express-validator
    return async (req, res, next) => {
      // Execute all validations
      await Promise.all(schema.map((validation) => validation.run(req)));

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
  }

  // Handle Joi schema
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== 'function') {
      return next(new AppError('Invalid validation schema', 500));
    }

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
