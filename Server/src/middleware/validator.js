import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

/**
 * Validation middleware for Joi schemas (body validation only)
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    // Check if body is empty or undefined
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(new AppError('Request body is empty or not properly parsed', 400));
    }
    
    console.log('🔍 Validation - Request body:', JSON.stringify(req.body, null, 2));
    
    // validateAsync returns a Promise that resolves to the validated value
    const value = await schema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    console.log('✅ Validation passed - Validated value:', JSON.stringify(value, null, 2));
    
    // Replace request body with validated value
    req.body = value;
    
    return next();
  } catch (error) {
    if (error.details) {
      console.error('❌ Validation errors:', error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
        value: d.context?.value
      })));
      
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return next(new AppError('Validation failed', 400, formattedErrors));
    }
    
    return next(error);
  }
};

/**
 * Validation middleware for Joi schemas with flexible request location
 * @param {Object} schema - Joi validation schema
 * @param {String} location - Where to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema, location = 'body') => async (req, res, next) => {
  const dataToValidate = req[location];

  try {
    // validateAsync returns a Promise that resolves to the validated value
    const value = await schema.validateAsync(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Replace request data with validated value
    req[location] = value;
    return next();
  } catch (error) {
    if (error.details) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return next(new AppError('Validation failed', 400, formattedErrors));
    }
    
    return next(error);
  }
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
