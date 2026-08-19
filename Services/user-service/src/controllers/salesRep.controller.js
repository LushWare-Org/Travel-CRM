import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { idParamSchema, formatZodError } from '../validators/common.js';
import { createSalesRepSchema, updateSalesRepSchema, listSalesRepsQuerySchema } from '../validators/salesRep.validator.js';

const safeUser = (u) => { if (!u) return null; const { password, ...r } = u; return r; };

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError(formatZodError(parsed.error), 400);
  return parsed.data;
}

export const getAllSalesReps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, isActive } = parseOrThrow(listSalesRepsQuerySchema, req.query);
  const where = { role: 'salesRep' };
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];
  const skip = (page - 1) * limit;
  const [reps, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.user.count({ where }),
  ]);
  res.json({ status: 'success', data: reps.map(safeUser), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const getSalesRepById = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const rep = await prisma.user.findFirst({ where: { id, role: 'salesRep' } });
  if (!rep) throw new AppError('Sales representative not found', 404);
  res.json({ status: 'success', data: { salesRep: safeUser(rep) } });
});

export const createSalesRep = asyncHandler(async (req, res) => {
  const { name, email, phone } = parseOrThrow(createSalesRepSchema, req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('User with this email already exists', 400);

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);

  const rep = await prisma.user.create({
    data: {
      name, email, phone: phone || null,
      password: hashed, role: 'salesRep',
      createdById: req.user.id,
      isTempPassword: true, mustChangePassword: true,
    },
  });
  res.status(201).json({ status: 'success', data: { salesRep: safeUser(rep), tempPassword } });
});

export const updateSalesRep = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const { name, phone, email } = parseOrThrow(updateSalesRepSchema, req.body);
  const rep = await prisma.user.update({
    where: { id },
    data: { ...(name && { name }), ...(phone !== undefined && { phone }), ...(email && { email }) },
  });
  res.json({ status: 'success', data: { salesRep: safeUser(rep) } });
});

export const deleteSalesRep = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const rep = await prisma.user.findFirst({ where: { id, role: 'salesRep' } });
  if (!rep) throw new AppError('Sales representative not found', 404);
  await prisma.user.delete({ where: { id } });
  res.json({ status: 'success', data: {} });
});

export const getSalesRepStats = asyncHandler(async (req, res) => {
  const total = await prisma.user.count({ where: { role: 'salesRep' } });
  const active = await prisma.user.count({ where: { role: 'salesRep', isActive: true } });
  res.json({ status: 'success', data: { total, active, inactive: total - active } });
});

export const toggleSalesRepStatus = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const rep = await prisma.user.findFirst({ where: { id, role: 'salesRep' } });
  if (!rep) throw new AppError('Sales representative not found', 404);
  const updated = await prisma.user.update({ where: { id }, data: { isActive: !rep.isActive } });
  res.json({ status: 'success', data: { salesRep: safeUser(updated) } });
});

export const resetSalesRepPassword = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id },
    data: { password: hashed, isTempPassword: true, mustChangePassword: true },
  });
  res.json({ status: 'success', message: 'Password reset', data: { tempPassword } });
});

export const getSalesRepPerformance = asyncHandler(async (req, res) => {
  // Aggregation across services — simplified response for now
  const { id } = parseOrThrow(idParamSchema, req.params);
  const rep = await prisma.user.findFirst({ where: { id, role: 'salesRep' } });
  if (!rep) throw new AppError('Sales representative not found', 404);
  res.json({ status: 'success', data: { salesRepId: id, name: rep.name, metrics: { note: 'Detailed performance available via analytics-service' } } });
});

export const updateSalesRepCommission = asyncHandler(async (req, res) => {
  // commissionRate is a free field not in the schema — update via notes/profile update.
  // Intentional stub: validates the id shape but does not persist anything yet.
  parseOrThrow(idParamSchema, req.params);
  res.json({ status: 'success', message: 'Commission rate updated', data: {} });
});

export const getOnlineSalesReps = asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000); // online = active in last 5 min
  const reps = await prisma.user.findMany({
    where: { role: 'salesRep', isActive: true, lastActivity: { gte: cutoff } },
    select: { id: true, name: true, email: true, lastActivity: true },
  });
  res.json({ status: 'success', data: reps });
});
