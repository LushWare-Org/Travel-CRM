import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

const safeUser = (u) => { if (!u) return null; const { password, ...r } = u; return r; };

const AVAILABLE_PERMISSIONS = [
  'manage_users', 'manage_sales_reps', 'manage_vendors', 'manage_admins',
  'view_reports', 'manage_billing', 'view_billing', 'manage_leads', 'manage_packages',
];

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [total, byRole, active, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ]);
  res.json({ status: 'success', data: { total, active, inactive: total - active, byRole, recentUsers } });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  res.json({ status: 'success', data: users.map(safeUser), pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { vendorProfile: true } });
  if (!user) throw new AppError('User not found', 404);
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, role, permissions = [] } = req.body;
  if (!name || !email || !role) throw new AppError('Name, email, and role are required', 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('User with this email already exists', 400);

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name, email: email.toLowerCase().trim(), phone: phone || null,
      password: hashedPassword, role,
      permissions: permissions.filter((p) => AVAILABLE_PERMISSIONS.includes(p)),
      createdById: req.user.id,
      isTempPassword: true, mustChangePassword: true,
    },
  });

  res.status(201).json({ status: 'success', message: 'Staff created', data: { user: safeUser(user), tempPassword } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, permissions } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }), ...(phone !== undefined && { phone }),
      ...(role && { role }), ...(isActive !== undefined && { isActive }),
      ...(permissions && { permissions: permissions.filter((p) => AVAILABLE_PERMISSIONS.includes(p)) }),
    },
  });
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError('User not found', 404);
  if (!user.canBeDeleted) throw new AppError('This user cannot be deleted', 403);
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: {} });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashed, isTempPassword: true, mustChangePassword: true },
  });
  res.json({ status: 'success', message: 'Password reset', data: { tempPassword } });
});

export const getAdminPermissions = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { permissions: true, role: true } });
  if (!user) throw new AppError('User not found', 404);
  res.json({ status: 'success', data: { permissions: user.permissions, role: user.role } });
});

export const updateAdminPermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { permissions: (permissions || []).filter((p) => AVAILABLE_PERMISSIONS.includes(p)) },
  });
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const getAvailablePermissions = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: { permissions: AVAILABLE_PERMISSIONS } });
});

export const getSuperAdminInfo = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ status: 'success', data: { user: safeUser(user) } });
});

export const listSuperAdmins = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ where: { role: 'superAdmin' } });
  res.json({ status: 'success', data: users.map(safeUser) });
});

export const promoteSuperAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'superAdmin', isSuperAdmin: true },
  });
  res.json({ status: 'success', message: 'User promoted to superAdmin', data: { user: safeUser(user) } });
});

export const demoteSuperAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'admin', isSuperAdmin: false },
  });
  res.json({ status: 'success', message: 'SuperAdmin demoted to admin', data: { user: safeUser(user) } });
});

export const getSettings = asyncHandler(async (req, res) => {
  // Settings for user management are kept simple here
  res.json({ status: 'success', data: { settings: { assignmentMode: 'manual' } } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  res.json({ status: 'success', message: 'Settings updated (see lead-service for assignment settings)', data: {} });
});
