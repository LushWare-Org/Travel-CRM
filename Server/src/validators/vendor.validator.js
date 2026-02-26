import Joi from 'joi';

/**
 * Vendor Schema Validators
 * Following industry best practices for data validation
 */

// Common schemas
const mongooseId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid vendor ID format',
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
  .trim()
  .required()
  .external(async (value) => {
    // Extract digits only for length check
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      throw new Error('Phone number must contain between 7-15 digits (can include +, spaces, (), or - separators)');
    }
    // Ensure it starts with a digit or + sign
    if (!/^[\+\d]/.test(value)) {
      throw new Error('Phone number must start with a digit or + sign');
    }
  })
  .messages({
    'any.required': 'Phone number is required',
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

const businessName = Joi.string()
  .min(2)
  .max(100)
  .trim()
  .required()
  .messages({
    'string.min': 'Business name must be at least 2 characters',
    'string.max': 'Business name cannot exceed 100 characters',
    'any.required': 'Business name is required',
  });

const serviceType = Joi.string()
  .valid('hotel', 'transport', 'activity', 'restaurant', 'guide', 'other')
  .required()
  .messages({
    'any.only': 'Service type must be one of: hotel, transport, activity, restaurant, guide, other',
    'any.required': 'Service type is required',
  });

const businessRegistrationNumber = Joi.string()
  .trim()
  .required()
  .messages({
    'string.base': 'Business registration number must be a string',
    'any.required': 'Business registration number is required',
  });

const taxIdentificationNumber = Joi.string()
  .trim()
  .required()
  .messages({
    'string.base': 'Tax identification number must be a string',
    'any.required': 'Tax identification number is required',
  });

const address = Joi.object({
  street: Joi.string().trim().allow('').optional(),
  city: Joi.string().trim().allow('').optional(),
  state: Joi.string().trim().allow('').optional(),
  zipCode: Joi.string().trim().allow('').optional(),
  country: Joi.string().trim().allow('').optional(),
}).optional();

const contactPerson = Joi.object({
  name: Joi.string().trim().allow('').optional(),
  phone: Joi.string()
    .trim()
    .allow('')
    .optional()
    .external(async (value) => {
      if (value) {
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          throw new Error('Phone number must contain between 7-15 digits (can include +, spaces, (), or - separators)');
        }
        if (!/^[\+\d]/.test(value)) {
          throw new Error('Phone number must start with a digit or + sign');
        }
      }
    }),
  email: Joi.string().email().lowercase().allow('')
    .optional(),
  designation: Joi.string().trim().allow('').optional(),
}).optional();

const bankDetails = Joi.object({
  accountName: Joi.string().trim().allow('').optional(),
  accountNumber: Joi.string().trim().allow('').optional(),
  bankName: Joi.string().trim().allow('').optional(),
  branchName: Joi.string().trim().allow('').optional(),
  ifscCode: Joi.string().trim().allow('').optional(),
  swiftCode: Joi.string().trim().allow('').optional(),
}).optional();

// Create vendor schema
export const createVendorSchema = Joi.object().keys({
  name,
  email,
  phone,
  businessName,
  serviceType,
  businessRegistrationNumber,
  taxIdentificationNumber,
  address,
  contactPerson,
  bankDetails,
});

// Update vendor schema
export const updateVendorSchema = Joi.object().keys({
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
  phone: Joi.string()
    .trim()
    .optional()
    .external(async (value) => {
      if (value) {
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          throw new Error('Phone number must contain between 7-15 digits (can include +, spaces, (), or - separators)');
        }
        if (!/^[\+\d]/.test(value)) {
          throw new Error('Phone number must start with a digit or + sign');
        }
      }
    }),
  businessName: Joi.string().min(2).max(100).trim()
    .optional()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 100 characters',
    }),
  serviceType: Joi.string()
    .valid('hotel', 'transport', 'activity', 'restaurant', 'guide', 'other')
    .optional()
    .messages({
      'any.only': 'Service type must be one of: hotel, transport, activity, restaurant, guide, other',
    }),
  businessRegistrationNumber: Joi.string().trim().optional(),
  taxIdentificationNumber: Joi.string().trim().optional(),
  address: Joi.object({
    street: Joi.string().trim().allow('').optional(),
    city: Joi.string().trim().allow('').optional(),
    state: Joi.string().trim().allow('').optional(),
    zipCode: Joi.string().trim().allow('').optional(),
    country: Joi.string().trim().allow('').optional(),
  }).optional(),
  contactPerson: Joi.object({
    name: Joi.string().trim().allow('').optional(),
    phone: Joi.string()
      .trim()
      .allow('')
      .optional()
      .external(async (value) => {
        if (value) {
          const digitsOnly = value.replace(/\D/g, '');
          if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            throw new Error('Phone number must contain between 7-15 digits (can include +, spaces, (), or - separators)');
          }
          if (!/^[\+\d]/.test(value)) {
            throw new Error('Phone number must start with a digit or + sign');
          }
        }
      }),
    email: Joi.string().email().lowercase().allow('')
      .optional(),
    designation: Joi.string().trim().allow('').optional(),
  }).optional(),
  bankDetails: Joi.object({
    accountName: Joi.string().trim().allow('').optional(),
    accountNumber: Joi.string().trim().allow('').optional(),
    bankName: Joi.string().trim().allow('').optional(),
    branchName: Joi.string().trim().allow('').optional(),
    ifscCode: Joi.string().trim().allow('').optional(),
    swiftCode: Joi.string().trim().allow('').optional(),
  }).optional(),
});

// Update vendor status schema
export const updateVendorStatusSchema = Joi.object().keys({
  vendorStatus: Joi.string()
    .valid('pending_verification', 'verified', 'suspended', 'rejected')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending_verification, verified, suspended, rejected',
      'any.required': 'Vendor status is required',
    }),
});

// Update vendor rating schema
export const updateVendorRatingSchema = Joi.object().keys({
  rating: Joi.number()
    .min(0)
    .max(5)
    .required()
    .messages({
      'number.min': 'Rating cannot be less than 0',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required',
    }),
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
export const vendorQuerySchema = Joi.object().keys({
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
  serviceType: Joi.string()
    .valid('hotel', 'transport', 'activity', 'restaurant', 'guide', 'other')
    .optional()
    .messages({
      'any.only': 'Service type must be one of: hotel, transport, activity, restaurant, guide, other',
    }),
  minRating: Joi.number()
    .min(0)
    .max(5)
    .optional()
    .messages({
      'number.min': 'Minimum rating cannot be less than 0',
      'number.max': 'Minimum rating cannot exceed 5',
    }),
  fields: Joi.string()
    .optional()
    .messages({
      'string.base': 'Fields must be a comma-separated string',
    }),
});

// Vendor ID parameter schema
export const vendorIdSchema = Joi.object().keys({
  id: mongooseId,
});

// Service type parameter schema
export const serviceTypeParamSchema = Joi.object().keys({
  serviceType: Joi.string()
    .valid('hotel', 'transport', 'activity', 'restaurant', 'guide', 'other')
    .required()
    .messages({
      'any.only': 'Service type must be one of: hotel, transport, activity, restaurant, guide, other',
      'any.required': 'Service type is required',
    }),
});
