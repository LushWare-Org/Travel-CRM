import Joi from 'joi';

/**
 * OTP validation schemas for two-factor authentication
 */

/**
 * Login Step 1: Email and password validation
 * Used before sending OTP code
 */
export const loginStep1Schema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
    }),
}).unknown(false);

/**
 * Login Step 2: OTP verification
 * Used to verify OTP and complete login
 */
export const loginStep2Schema = Joi.object({
  tempToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Temporary token is required',
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only digits',
    }),
}).unknown(false);

/**
 * Resend OTP validation
 * Used when user requests a new OTP code
 */
export const resendOTPSchema = Joi.object({
  tempToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Temporary token is required',
    }),
}).unknown(false);

/**
 * Disable OTP validation (admin only)
 * Used to disable OTP requirement for a specific user
 */
export const disableOTPSchema = Joi.object({
  userId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'User ID is required',
      'string.regex.base': 'Invalid user ID format',
    }),
}).unknown(false);
