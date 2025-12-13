import crypto from 'crypto';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import otpService from '../utils/otpService.js';
import logger from '../config/logger.js';

// Generate token and send cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  // Calculate cookie expiration (7 days default)
  const cookieExpiresIn = parseInt(process.env.COOKIE_EXPIRES_IN || process.env.JWT_COOKIE_EXPIRES_IN || '7', 10);
  const maxAge = isNaN(cookieExpiresIn) ? 7 * 24 * 60 * 60 * 1000 : cookieExpiresIn * 24 * 60 * 60 * 1000;
  
  const options = {
    maxAge: maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Update last login
  user.lastLogin = Date.now();
  user.save({ validateBeforeSave: false }).catch((err) => {
    logger.error(`Failed to update lastLogin: ${err.message}`);
  });

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
        isSuperAdmin: user.isSuperAdmin || false, // FIXED: Include isSuperAdmin flag for role verification
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
        permissions: user.permissions || [], // Include permissions array for granular permission checks
      },
    },
  });
};

// @desc    Register customer (public registration)
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const {
    name, email, phone, password,
  } = req.body;

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

  // Check if user is admin or superAdmin and OTP is enabled
  if ((user.role === 'admin' || user.role === 'superAdmin') && user.isOtpEnabled) {
    // Generate and send OTP
    const otpCode = user.generateOtpCode();
    await user.save({ validateBeforeSave: false });

    otpService.logOtpActivity(user._id, 'LOGIN_OTP_SENT', {
      email: user.email,
      role: user.role,
    });

    try {
      await emailService.sendOtpCode(user, otpCode);

      return res.status(200).json({
        status: 'success',
        message: 'OTP code sent to your email. Please verify to complete login.',
        data: {
          requiresOtp: true,
          email: user.email,
          otpMethod: user.otpMethod,
          expiresIn: '10 minutes',
          userId: user._id,
        },
      });
    } catch (err) {
      // Clear OTP if email fails
      user.otpCode = undefined;
      user.otpExpire = undefined;
      user.lastOtpSentAt = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error(`Failed to send login OTP: ${err.message}`);
      throw new AppError('Failed to send OTP. Please try again later.', 500);
    }
  }

  // For non-admin users, proceed with regular login
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

// @desc    Reset temporary password (for users with temp credentials)
// @route   POST /api/v1/auth/reset-temp-password
// @access  Public
export const resetTempPassword = asyncHandler(async (req, res, next) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;

  // Verify passwords match
  if (newPassword !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  // Find user by email
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify temporary password
  const isPasswordMatch = await user.matchPassword(currentPassword);
  if (!isPasswordMatch) {
    throw new AppError('Invalid temporary password', 401);
  }

  // Check if user has temporary password flag
  if (!user.isTempPassword) {
    throw new AppError('This user does not have a temporary password', 400);
  }

  // Update password
  user.password = newPassword;
  user.isTempPassword = false;
  user.mustChangePassword = false;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send password changed email
  emailService
    .sendPasswordChanged(user)
    .catch((err) => logger.error(`Failed to send password changed email: ${err.message}`));

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful. You can now log in with your new password.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
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

// @desc    Send OTP code to user email for login verification
// @route   POST /api/v1/auth/send-otp
// @access  Public (after initial login)
export const sendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  // Get user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if OTP is enabled for this user
  if (!user.isOtpEnabled) {
    throw new AppError('OTP is not enabled for your account', 400);
  }

  // Check cooldown period (prevent OTP spam)
  const { canResend, remainingSeconds } = otpService.checkResendCooldown(user.lastOtpSentAt, 30);
  
  if (!canResend) {
    throw new AppError(
      `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      429
    );
  }

  // Generate OTP code
  const otpCode = user.generateOtpCode();
  await user.save({ validateBeforeSave: false });

  // Log OTP sent activity
  otpService.logOtpActivity(user._id, 'OTP_SENT', {
    email: user.email,
    otpMethod: user.otpMethod,
  });

  try {
    // Send OTP via email
    await emailService.sendOtpCode(user, otpCode);

    res.status(200).json({
      status: 'success',
      message: 'OTP code sent to your email. It will expire in 10 minutes.',
      data: {
        email: user.email,
        otpMethod: user.otpMethod,
        expiresIn: '10 minutes',
      },
    });
  } catch (err) {
    // Clear OTP if email fails
    user.otpCode = undefined;
    user.otpExpire = undefined;
    user.lastOtpSentAt = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error(`Failed to send OTP: ${err.message}`);
    throw new AppError('Failed to send OTP. Please try again later.', 500);
  }
});

// @desc    Verify OTP code and return JWT token
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otpCode } = req.body;

  // Validate input
  if (!email || !otpCode) {
    throw new AppError('Email and OTP code are required', 400);
  }

  // Get user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if OTP is enabled
  if (!user.isOtpEnabled) {
    throw new AppError('OTP is not enabled for your account', 400);
  }

  // Check if OTP code exists
  if (!user.otpCode || !user.otpExpire) {
    throw new AppError('No OTP code found. Please request a new code.', 400);
  }

  // Check if OTP has expired
  if (otpService.isOtpExpired(user.otpExpire)) {
    throw new AppError('OTP code has expired. Please request a new code.', 400);
  }

  // Check attempt limits
  if (otpService.isOtpAttemptsExceeded(user.otpAttempts)) {
    throw new AppError('Too many failed attempts. Please request a new OTP code.', 429);
  }

  // Verify OTP code
  const isOtpValid = await user.verifyOtpCode(otpCode);

  if (!isOtpValid) {
    // Increment failed attempts
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });

    otpService.logOtpActivity(user._id, 'OTP_VERIFY_FAILED', {
      email: user.email,
      attempt: user.otpAttempts,
    });

    throw new AppError('Invalid OTP code', 401);
  }

  // Clear OTP after successful verification
  user.clearOtp();
  await user.save({ validateBeforeSave: false });

  // Log successful OTP verification
  otpService.logOtpActivity(user._id, 'OTP_VERIFIED', {
    email: user.email,
  });

  // Send success notification email
  emailService
    .sendOtpVerificationSuccess(user)
    .catch((err) => logger.error(`Failed to send OTP verification email: ${err.message}`));

  // Return token using the existing sendTokenResponse function
  sendTokenResponse(user, 200, res, 'OTP verified successfully. Login completed.');
});

// @desc    Resend OTP code
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check cooldown period
  const { canResend, remainingSeconds } = otpService.checkResendCooldown(user.lastOtpSentAt, 30);
  
  if (!canResend) {
    throw new AppError(
      `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      429
    );
  }

  // Generate new OTP code
  const otpCode = user.generateOtpCode();
  await user.save({ validateBeforeSave: false });

  otpService.logOtpActivity(user._id, 'OTP_RESENT', {
    email: user.email,
  });

  try {
    await emailService.sendOtpCode(user, otpCode);

    res.status(200).json({
      status: 'success',
      message: 'New OTP code sent to your email. It will expire in 10 minutes.',
      data: {
        email: user.email,
        expiresIn: '10 minutes',
      },
    });
  } catch (err) {
    user.otpCode = undefined;
    user.otpExpire = undefined;
    user.lastOtpSentAt = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error(`Failed to resend OTP: ${err.message}`);
    throw new AppError('Failed to send OTP. Please try again later.', 500);
  }
});

