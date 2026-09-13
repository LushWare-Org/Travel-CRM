import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../db/client.js';
import * as userDb from '../db/userQueries.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as emailService from '../utils/email.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      permissions: user.permissions || [],
      isSuperAdmin: user.isSuperAdmin || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

const sendTokenResponse = async (user, statusCode, res, message = 'Success') => {
  const token = signToken(user);

  const cookieExpiresIn = parseInt(process.env.COOKIE_EXPIRES_IN || '7', 10);
  const maxAge = (isNaN(cookieExpiresIn) ? 7 : cookieExpiresIn) * 24 * 60 * 60 * 1000;

  res.cookie('token', token, {
    maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  await userDb.updateLastLogin(user.id).catch(() => {});

  res.status(statusCode).json({
    status: 'success',
    message,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
        permissions: user.permissions || [],
      },
    },
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Dev-only escape hatch: salesRep OTP is intentionally not bypassable in
// production (see docs/OTP_LOGIN_FIX.md) — this only skips it when both the
// environment is non-production AND it's explicitly opted into, so nothing
// changes unless SKIP_OTP=true is set on purpose in a dev/test .env.
const otpBypassEnabled = () => process.env.NODE_ENV !== 'production' && process.env.SKIP_OTP === 'true';

const generateTempToken = (userId) =>
  jwt.sign({ userId, tempAuth: true }, process.env.JWT_SECRET, { expiresIn: '15m' });

const verifyTempToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired temporary token', 401);
  }
};

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ─── Controllers ───────────────────────────────────────────────────────────────

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) throw new AppError('Name, email and password are required', 400);

  const existing = await userDb.findUserByEmail(email.toLowerCase().trim());
  if (existing) throw new AppError('User with this email already exists', 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await userDb.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || null,
    password: hashedPassword,
    role: 'customer',
  });

  // Generate email verification token (plain token → hash stored in DB)
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerification = hashToken(verificationToken);
  const verificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await userDb.setEmailVerificationToken(user.id, hashedVerification, verificationExpire);

  emailService.sendEmailVerification(user, verificationToken);
  emailService.sendWelcomeEmail(user);

  await sendTokenResponse(user, 201, res, 'Registration successful. Please check your email to verify your account.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await userDb.findUserByEmail(email.toLowerCase().trim());
  if (!user) throw new AppError('Invalid credentials', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  if (!user.isActive) throw new AppError('Your account has been deactivated. Please contact support.', 403);

  if (user.mustChangePassword) {
    return res.status(200).json({
      status: 'success',
      message: 'Password change required',
      data: { mustChangePassword: true, userId: user.id, email: user.email },
    });
  }

  // Sales reps require OTP (bypassable only via SKIP_OTP in non-production envs)
  if (user.role === 'salesRep' && !otpBypassEnabled()) {
    const otp = generateOTP();
    await prisma.otp.deleteMany({ where: { userId: user.id, type: 'login', isUsed: false } });
    await prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'login',
        email: user.email,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    await emailService.sendOTPEmail(user, otp).catch((err) => {
      throw new AppError('Failed to send OTP. Please try again.', 500);
    });

    return res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to continue.',
      data: { tempToken: generateTempToken(user.id), maskedEmail: maskEmail(user.email), expiresIn: 600, requiresOTP: true },
    });
  }

  await sendTokenResponse(user, 200, res, 'Login successful');
});

export const loginStep1 = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await userDb.findUserByEmail(email.toLowerCase().trim());
  if (!user) throw new AppError('Invalid credentials', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  if (!user.isActive) throw new AppError('Account deactivated', 403);

  if (user.role !== 'salesRep' || otpBypassEnabled()) {
    return sendTokenResponse(user, 200, res, 'Login successful');
  }

  const otp = generateOTP();
  await prisma.otp.deleteMany({ where: { userId: user.id, type: 'login', isUsed: false } });
  await prisma.otp.create({
    data: {
      userId: user.id,
      code: otp,
      type: 'login',
      email: user.email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  await emailService.sendOTPEmail(user, otp);

  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your email.',
    data: { tempToken: generateTempToken(user.id), maskedEmail: maskEmail(user.email), expiresIn: 600 },
  });
});

export const loginStep2 = asyncHandler(async (req, res) => {
  const { tempToken, otp } = req.body;
  if (!tempToken || !otp) throw new AppError('tempToken and otp are required', 400);

  const decoded = verifyTempToken(tempToken);
  const user = await userDb.findUserById(decoded.userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'salesRep') throw new AppError('OTP verification only required for sales representatives', 403);

  const otpRecord = await prisma.otp.findFirst({
    where: { userId: user.id, code: String(otp).trim(), type: 'login', isUsed: false },
  });
  if (!otpRecord) throw new AppError('Invalid OTP. Please try again.', 401);
  if (new Date() > otpRecord.expiresAt) {
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    throw new AppError('OTP has expired. Please request a new one.', 401);
  }

  await prisma.otp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
  emailService.sendLoginNotification(user);

  await sendTokenResponse(user, 200, res, 'Login successful');
});

export const resendOTP = asyncHandler(async (req, res) => {
  const { tempToken } = req.body;
  if (!tempToken) throw new AppError('tempToken is required', 400);

  const decoded = verifyTempToken(tempToken);
  const user = await userDb.findUserById(decoded.userId);
  if (!user) throw new AppError('User not found', 404);

  const otp = generateOTP();
  await prisma.otp.deleteMany({ where: { userId: user.id, type: 'login', isUsed: false } });
  await prisma.otp.create({
    data: {
      userId: user.id,
      code: otp,
      type: 'login',
      email: user.email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  await emailService.sendOTPEmail(user, otp);

  res.status(200).json({
    status: 'success',
    message: 'New OTP sent.',
    data: { maskedEmail: maskEmail(user.email), expiresIn: 600 },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10000), httpOnly: true });
  res.status(200).json({ status: 'success', message: 'Logged out successfully', data: null });
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) throw new AppError('Not authenticated', 401);

  const user = await userDb.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  res.status(200).json({ status: 'success', data: { user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords are required', 400);

  const rows = await prisma.$queryRaw`
    SELECT id, password FROM crm_users."User" WHERE id = ${userId} LIMIT 1
  `;
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Current password is incorrect', 401);
  if (currentPassword === newPassword) throw new AppError('New password must be different', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await userDb.updatePassword(userId, hashed);

  const updated = await userDb.findUserById(userId);
  emailService.sendPasswordChanged(updated);

  await sendTokenResponse(updated, 200, res, 'Password changed successfully');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const user = await userDb.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    return res.status(200).json({ status: 'success', message: 'If an account exists with this email, a password reset link will be sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(resetToken);
  const expireDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await userDb.setResetPasswordToken(user.id, hashedToken, expireDate);

  try {
    await emailService.sendPasswordReset(user, resetToken);
    res.status(200).json({ status: 'success', message: 'Password reset email sent successfully' });
  } catch {
    await prisma.$executeRaw`
      UPDATE crm_users."User" SET "resetPasswordToken"=NULL,"resetPasswordExpire"=NULL WHERE id=${user.id}
    `;
    throw new AppError('Email could not be sent. Please try again later.', 500);
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const hashedToken = hashToken(req.params.token);

  const user = await userDb.findUserByResetToken(hashedToken);
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const hashed = await bcrypt.hash(password, 12);
  await userDb.updatePassword(user.id, hashed);

  const updated = await userDb.findUserById(user.id);
  emailService.sendPasswordChanged(updated);

  await sendTokenResponse(updated, 200, res, 'Password reset successful');
});

export const resetTempPassword = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) throw new AppError('Passwords do not match', 400);

  const rows = await prisma.$queryRaw`
    SELECT id, name, email, role::text AS role, "isSuperAdmin", permissions, password, "isTempPassword"
    FROM crm_users."User" WHERE email = ${email.toLowerCase().trim()} LIMIT 1
  `;
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404);
  if (!user.isTempPassword) throw new AppError('This user does not have a temporary password', 400);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Invalid temporary password', 401);

  const hashed = await bcrypt.hash(newPassword, 12);
  await userDb.updatePassword(user.id, hashed);

  const updated = await userDb.findUserById(user.id);
  emailService.sendPasswordChanged(updated);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful. You can now log in with your new password.',
    data: { user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = hashToken(req.params.token);
  const user = await userDb.findUserByVerificationToken(hashedToken);
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  await userDb.markEmailVerified(user.id);
  res.status(200).json({ status: 'success', message: 'Email verified successfully' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = await userDb.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) throw new AppError('Email is already verified', 400);

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerification = hashToken(verificationToken);
  const verificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await userDb.setEmailVerificationToken(user.id, hashedVerification, verificationExpire);

  try {
    await emailService.sendEmailVerification(user, verificationToken);
    res.status(200).json({ status: 'success', message: 'Verification email sent' });
  } catch {
    throw new AppError('Email could not be sent. Please try again.', 500);
  }
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, phone } = req.body;

  await userDb.updateUserProfile(userId, { name, phone });
  const updated = await userDb.findUserById(userId);

  res.status(200).json({ status: 'success', message: 'Profile updated', data: { user: updated } });
});
