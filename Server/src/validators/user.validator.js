import Joi from 'joi';

/**
 * Create user validation schema (admin creating users)
 * Supports international phone numbers with country codes
 */
export const createUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Please provide a valid international phone number (e.g., +94768952480 or +1-555-0000)',
    }),
  phoneCountry: Joi.string()
    .length(2)
    .uppercase()
    .optional()
    .messages({
      'string.length': 'Country code must be 2 characters',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
    }),
  role: Joi.string()
    .valid('customer', 'salesRep', 'vendor', 'admin', 'superAdmin')
    .required()
    .messages({
      'string.empty': 'Role is required',
      'any.only': 'Role must be one of: customer, salesRep, vendor, admin, superAdmin',
    }),
}).unknown(false);

/**
 * Update user validation schema
 * Supports international phone numbers with country codes
 */
export const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid international phone number (e.g., +94768952480 or +1-555-0000)',
    }),
  phoneCountry: Joi.string()
    .length(2)
    .uppercase()
    .optional()
    .messages({
      'string.length': 'Country code must be 2 characters',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  role: Joi.string()
    .valid('customer', 'salesRep', 'vendor', 'admin', 'superAdmin')
    .messages({
      'any.only': 'Role must be one of: customer, salesRep, vendor, admin, superAdmin',
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
    }),
}).unknown(false).min(1);

/**
 * Update user password validation schema
 */
export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'any.invalid': 'New password must be different from current password',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your new password',
    }),
}).unknown(false);

/**
 * Assign user role validation schema
 */
export const assignRoleSchema = Joi.object({
  role: Joi.string()
    .valid('customer', 'salesRep', 'vendor', 'admin', 'superAdmin')
    .required()
    .messages({
      'string.empty': 'Role is required',
      'any.only': 'Role must be one of: customer, salesRep, vendor, admin, superAdmin',
    }),
}).unknown(false);

/**
 * Toggle user status validation schema
 */
export const toggleStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive is required',
    }),
}).unknown(false);

/**
 * Get users by role validation schema (for params)
 */
export const getRoleParamSchema = Joi.object({
  role: Joi.string()
    .valid('customer', 'salesRep', 'vendor', 'admin', 'superAdmin')
    .required()
    .messages({
      'string.empty': 'Role is required',
      'any.only': 'Role must be one of: customer, salesRep, vendor, admin, superAdmin',
    }),
}).unknown(false);

/**
 * Query parameters validation for user listing
 */
export const userQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  sort: Joi.string()
    .messages({
      'string.base': 'Sort must be a string',
    }),
  search: Joi.string()
    .messages({
      'string.base': 'Search must be a string',
    }),
  role: Joi.string()
    .valid('customer', 'salesRep', 'vendor', 'admin', 'superAdmin')
    .messages({
      'any.only': 'Role must be one of: customer, salesRep, vendor, admin, superAdmin',
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
    }),
  isEmailVerified: Joi.boolean()
    .messages({
      'boolean.base': 'isEmailVerified must be a boolean value',
    }),
}).unknown(false);

/**
 * Get user by ID validation schema
 */
export const getUserIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
}).unknown(false);
