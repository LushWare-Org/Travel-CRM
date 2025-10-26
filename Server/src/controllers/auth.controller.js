import crypto from 'crypto';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

// Generate token and send cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Update last login
  user.lastLogin = Date.now();
  user.save({ validateBeforeSave: false });

  res.status(statusCode).cookie('token', token, options).json({
    status: 'success',
    message,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
      },
    },
  });
};

// @desc    Register customer (public registration)
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Create user (only customers can self-register)
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'customer', // Force customer role for public registration
  });

  // Generate email verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email (don't block the response)
  emailService
    .sendEmailVerification(user, verificationToken)
    .catch((err) => logger.error(`Failed to send verification email: ${err.message}`));

  // Send welcome email
  emailService
    .sendWelcomeEmail(user)
    .catch((err) => logger.error(`Failed to send welcome email: ${err.message}`));

  sendTokenResponse(user, 201, res, 'Registration successful. Please check your email to verify your account.');
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Get user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if password matches
  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Check if user must change password (for staff created by admin)
  if (user.mustChangePassword) {
    return res.status(200).json({
      status: 'success',
      message: 'Password change required',
      data: {
        mustChangePassword: true,
        userId: user._id,
        email: user.email,
      },
    });
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
    data: null,
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isPasswordMatch = await user.matchPassword(currentPassword);
  if (!isPasswordMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Check if new password is same as current
  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from current password', 400);
  }

  // Update password
  user.password = newPassword;
  user.mustChangePassword = false;
  user.isTempPassword = false;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send password changed email
  emailService
    .sendPasswordChanged(user)
    .catch((err) => logger.error(`Failed to send password changed email: ${err.message}`));

  sendTokenResponse(user, 200, res, 'Password changed successfully');
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists for security
    return res.status(200).json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordReset(user, resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent successfully',
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error(`Failed to send password reset email: ${err.message}`);
    throw new AppError('Email could not be sent. Please try again later.', 500);
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  // Hash token from URL
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find user by token and check if token is not expired
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.mustChangePassword = false;
  user.isTempPassword = false;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send password changed email
  emailService
    .sendPasswordChanged(user)
    .catch((err) => logger.error(`Failed to send password changed email: ${err.message}`));

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req, res, next) => {
  // Hash token from URL
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find user by token and check if token is not expired
  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
  });
});

// @desc    Resend email verification
// @route   POST /api/v1/auth/resend-verification
// @access  Private
export const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate new verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendEmailVerification(user, verificationToken);

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent successfully',
    });
  } catch (err) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error(`Failed to send verification email: ${err.message}`);
    throw new AppError('Email could not be sent. Please try again later.', 500);
  }
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user.id);

  if (name) user.name = name;
  if (phone) user.phone = phone;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user,
    },
  });
});
