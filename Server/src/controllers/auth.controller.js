import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import OTP from '../models/otp.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

// Generate token and send cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  // Calculate cookie expiration (7 days default)
  const cookieExpiresIn = parseInt(process.env.COOKIE_EXPIRES_IN || process.env.JWT_COOKIE_EXPIRES_IN || '7', 10);
  const maxAge = isNaN(cookieExpiresIn) ? 7 * 24 * 60 * 60 * 1000 : cookieExpiresIn * 24 * 60 * 60 * 1000;

  const options = {
    maxAge,
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

  // ⚠️ SALES REPS REQUIRE OTP LOGIN - Redirect to OTP flow
  if (user.role === 'salesRep') {
    // Generate 6-digit OTP
    const otp = generateOTP();

    // Delete any existing OTP for this user
    await OTP.deleteMany({ userId: user._id, type: 'login', isUsed: false });

    // Store OTP in database
    const otpRecord = await OTP.create({
      userId: user._id,
      code: otp,
      type: 'login',
      email: user.email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Send OTP via email
    try {
      await emailService.sendOTPEmail(user, otp);
    } catch (error) {
      logger.error(`Failed to send OTP email: ${error.message}`);
      await OTP.deleteOne({ _id: otpRecord._id });
      throw new AppError('Failed to send OTP. Please try again.', 500);
    }

    // Generate temporary token
    const tempToken = generateTempToken(user._id);

    return res.status(200).json({
      status: 'success',
      message: 'Sales representative login requires OTP verification. OTP sent to your email.',
      data: {
        tempToken,
        maskedEmail: maskEmail(user.email),
        expiresIn: 600, // 10 minutes in seconds
        requiresOTP: true, // Flag to indicate OTP is required
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

// @desc    Reset temporary password (for users with temp credentials)
// @route   POST /api/v1/auth/reset-temp-password
// @access  Public
export const resetTempPassword = asyncHandler(async (req, res, next) => {
  const {
    email, currentPassword, newPassword, confirmPassword,
  } = req.body;

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

// ==========================================
// OTP Authentication Functions (Sales Rep)
// ==========================================

/**
 * Generate a random 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Generate temporary token for OTP verification
 * @param {string} userId - User ID
 * @returns {string} Temporary JWT token
 */
const generateTempToken = (userId) => jwt.sign(
  { userId, tempAuth: true },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }, // Temp token valid for 15 minutes
);

/**
 * Verify temporary token
 * @param {string} token - Temporary JWT token
 * @returns {object} Decoded token
 */
const verifyTempToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired temporary token', 401);
  }
};

/**
 * Mask email for privacy (e.g., an***@gmail.com)
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  const maskedName = `${name.substring(0, 2)}***`;
  return `${maskedName}@${domain}`;
};

// @desc    Login Step 1: Verify email and password, send OTP
// @route   POST /api/v1/auth/login-step1
// @access  Public
export const loginStep1 = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Get user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Only sales reps require OTP for login
  if (user.role !== 'salesRep') {
    // For non-sales reps, proceed with normal login
    return sendTokenResponse(user, 200, res, 'Login successful');
  }

  // Generate 6-digit OTP
  const otp = generateOTP();

  // Delete any existing OTP for this user
  await OTP.deleteMany({ userId: user._id, type: 'login', isUsed: false });

  // Store OTP in database
  const otpRecord = await OTP.create({
    userId: user._id,
    code: otp,
    type: 'login',
    email: user.email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Send OTP via email
  try {
    await emailService.sendOTPEmail(user, otp);
  } catch (error) {
    logger.error(`Failed to send OTP email: ${error.message}`);
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('Failed to send OTP. Please try again.', 500);
  }

  // Generate temporary token
  const tempToken = generateTempToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your email. Please verify to continue.',
    data: {
      tempToken,
      maskedEmail: maskEmail(user.email),
      expiresIn: 600, // 10 minutes in seconds
    },
  });
});

// @desc    Login Step 2: Verify OTP and complete login
// @route   POST /api/v1/auth/login-step2
// @access  Public
export const loginStep2 = asyncHandler(async (req, res, next) => {
  const { tempToken, otp } = req.body;

  // Verify temporary token
  const decoded = verifyTempToken(tempToken);
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify user is a sales rep
  if (user.role !== 'salesRep') {
    throw new AppError('OTP verification only required for sales representatives', 403);
  }

  // Find matching OTP
  const otpRecord = await OTP.findOne({
    userId: user._id,
    code: String(otp).trim(), // Ensure string and trim whitespace
    type: 'login',
    isUsed: false,
  });

  if (!otpRecord) {
    // Temporarily removed attempt limitation for debugging
    throw new AppError('Invalid OTP. Please try again.', 401);
  }

  // Check OTP expiration
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('OTP has expired. Please request a new one.', 401);
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Send login successful email
  try {
    await emailService.sendLoginNotification(user);
  } catch (error) {
    logger.error(`Failed to send login notification: ${error.message}`);
  }

  // Issue JWT token and send response
  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Resend OTP code
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOTP = asyncHandler(async (req, res, next) => {
  const { tempToken } = req.body;

  // Verify temporary token
  const decoded = verifyTempToken(tempToken);
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete old unused OTP codes
  await OTP.deleteMany({ userId: user._id, type: 'login', isUsed: false });

  // Generate new OTP
  const newOtp = generateOTP();

  const otpRecord = await OTP.create({
    userId: user._id,
    code: newOtp,
    type: 'login',
    email: user.email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Send new OTP via email
  try {
    await emailService.sendOTPEmail(user, newOtp);
  } catch (error) {
    logger.error(`Failed to send OTP email: ${error.message}`);
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('Failed to send OTP. Please try again.', 500);
  }

  res.status(200).json({
    status: 'success',
    message: 'New OTP sent to your email',
    data: {
      maskedEmail: maskEmail(user.email),
      expiresIn: 600, // 10 minutes in seconds
    },
  });
});
