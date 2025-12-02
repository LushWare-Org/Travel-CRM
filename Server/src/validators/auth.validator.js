import Joi from 'joi';

// Register validation (for customers only)
export const registerSchema = Joi.object({
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
    .pattern(/^\+?[0-9]{7,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (with or without country code)',
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
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your password',
    }),
});

// Login validation
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

// Change password validation
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your new password',
    }),
});

// Forgot password validation
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
});

// Reset password validation
export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your password',
    }),
});

// Update profile validation
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
    }),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{7,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (with or without country code)',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
});

// Admin create staff validation (for salesRep and vendor)
export const createStaffSchema = Joi.object({
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
    .pattern(/^\+?[0-9]{7,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (with or without country code)',
    }),
  role: Joi.string()
    .valid('salesRep', 'vendor', 'admin')
    .required()
    .messages({
      'string.empty': 'Role is required',
      'any.only': 'Role must be either salesRep, vendor, or admin',
    }),
  permissions: Joi.array()
    .items(
      Joi.string().valid(
        'manage_users',
        'manage_sales_reps',
        'manage_vendors',
        'manage_admins',
        'view_reports',
        'manage_billing',
      ),
    )
    .messages({
      'array.base': 'Permissions must be an array',
      'any.only': 'Invalid permission specified',
    }),
}).unknown(true);

// Promote user to superAdmin validation
export const promoteSuperAdminSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'string.empty': 'User ID is required',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
});

// Demote superAdmin validation
export const demoteSuperAdminSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'string.empty': 'User ID is required',
    }),
  newRole: Joi.string()
    .valid('admin', 'salesRep', 'vendor', 'customer')
    .required()
    .messages({
      'string.empty': 'New role is required',
      'any.only': 'Invalid role specified',
    }),
});

// Update user status validation
export const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive is required',
    }),
});

// Update admin permissions validation
export const updatePermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(
      Joi.string().valid(
        'manage_users',
        'manage_sales_reps',
        'manage_vendors',
        'manage_admins',
        'view_reports',
        'manage_billing',
      ),
    )
    .required()
    .messages({
      'array.base': 'Permissions must be an array',
      'any.only': 'Invalid permission specified',
      'any.required': 'Permissions array is required',
    }),
});
