import Joi from 'joi';

/**
 * Sales Rep Schema Validators
 * Following industry best practices for data validation
 */

// Common schemas
const mongooseId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid sales rep ID format',
  });

const email = Joi.string()
  .email()
  .lowercase()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

const phone = Joi.string()
  .regex(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g., +94768952480)',
    'any.required': 'Phone number is required',
  });

const phoneCountry = Joi.string()
  .length(2)
  .uppercase()
  .required()
  .messages({
    'string.length': 'Country code must be 2 characters',
    'any.required': 'Country code is required',
  });

const name = Joi.string()
  .min(2)
  .max(50)
  .trim()
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required',
  });

const commissionRate = Joi.number()
  .min(0)
  .max(100)
  .required()
  .messages({
    'number.min': 'Commission rate cannot be less than 0%',
    'number.max': 'Commission rate cannot exceed 100%',
    'any.required': 'Commission rate is required',
  });

// Create sales rep schema
export const createSalesRepSchema = Joi.object().keys({
  name,
  email,
  phone,
  phoneCountry,
  commissionRate,
  targetLeads: Joi.number().min(1).optional().messages({
    'number.min': 'Target leads must be at least 1',
  }),
});

// Update sales rep schema
export const updateSalesRepSchema = Joi.object().keys({
  name: Joi.string().min(2).max(50).trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
    }),
  email: Joi.string().email().lowercase().optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string().regex(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g., +94768952480)',
  }),
  phoneCountry: Joi.string().length(2).uppercase().optional()
    .messages({
      'string.length': 'Country code must be 2 characters',
    }),
  commissionRate: Joi.number().min(0).max(100).optional()
    .messages({
      'number.min': 'Commission rate cannot be less than 0%',
      'number.max': 'Commission rate cannot exceed 100%',
    }),
});

// Update commission schema
export const updateCommissionSchema = Joi.object().keys({
  commissionRate,
});

// Toggle status schema
export const toggleStatusSchema = Joi.object().keys({
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'Status must be a boolean',
      'any.required': 'Status is required',
    }),
});

// Query parameters schema
export const salesRepQuerySchema = Joi.object().keys({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  sort: Joi.string()
    .optional()
    .messages({
      'string.base': 'Sort must be a string (e.g., "-createdAt")',
    }),
  search: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'invited')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, invited',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean',
    }),
  isEmailVerified: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isEmailVerified must be a boolean',
    }),
  fields: Joi.string()
    .optional()
    .messages({
      'string.base': 'Fields must be a comma-separated string',
    }),
});

// Sales rep ID parameter schema
export const salesRepIdSchema = Joi.object().keys({
  id: mongooseId,
});
