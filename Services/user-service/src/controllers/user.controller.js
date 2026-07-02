import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

const safeUser = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
};

export const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { vendorProfile: true } });
  if (!user) throw new AppError('User not found', 404);
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name && { name }), ...(phone !== undefined && { phone }) },
  });
  res.json({ status: 'success', message: 'Profile updated', data: { user: safeUser(user) } });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }, include: { vendorProfile: true } }),
    prisma.user.count({ where }),
  ]);
  res.json({
    status: 'success',
    data: users.map(safeUser),
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { vendorProfile: true } });
  if (!user) throw new AppError('User not found', 404);
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  if (!name || !email || !role) throw new AppError('Name, email, and role are required', 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('User with this email already exists', 400);

  const tempPassword = password || crypto.randomBytes(8).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password: hashedPassword,
      role,
      createdById: req.user.id,
      isTempPassword: !password,
      mustChangePassword: !password,
    },
  });

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: { user: safeUser(user), ...(!password && { tempPassword }) },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, permissions } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(permissions && { permissions }),
    },
  });
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const updateUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw new AppError('Password is required', 400);
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashed, passwordChangedAt: new Date(), mustChangePassword: false, isTempPassword: false },
  });
  res.json({ status: 'success', message: 'Password updated', data: { user: safeUser(user) } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError('User not found', 404);
  if (!user.canBeDeleted) throw new AppError('This user cannot be deleted', 403);
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'User deleted', data: {} });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError('User not found', 404);
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
  });
  res.json({ status: 'success', message: `User ${updated.isActive ? 'activated' : 'deactivated'}`, data: { user: safeUser(updated) } });
});

export const getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const users = await prisma.user.findMany({
    where: { role },
    orderBy: { name: 'asc' },
  });
  res.json({ status: 'success', count: users.length, data: users.map(safeUser) });
});

export const assignUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role) throw new AppError('Role is required', 400);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json({ status: 'success', message: 'Role updated', data: { user: safeUser(user) } });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const [total, byRole, active] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.user.count({ where: { isActive: true } }),
  ]);
  res.json({ status: 'success', data: { total, active, inactive: total - active, byRole } });
});
