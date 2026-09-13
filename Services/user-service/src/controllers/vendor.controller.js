import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { idParamSchema, formatZodError, SERVICE_TYPES } from '../validators/common.js';
import {
  createVendorSchema, updateVendorSchema, updateVendorStatusSchema,
  updateVendorRatingSchema, listVendorsQuerySchema,
} from '../validators/vendor.validator.js';
import { z } from 'zod';

const safeUser = (u) => { if (!u) return null; const { password, ...r } = u; return r; };

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError(formatZodError(parsed.error), 400);
  return parsed.data;
}

const serviceTypeParamSchema = z.object({ serviceType: z.enum(SERVICE_TYPES) });

export const getAllVendors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, isActive, serviceType, vendorStatus } = parseOrThrow(listVendorsQuerySchema, req.query);
  const where = { role: 'vendor' };
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
  const vpWhere = {};
  if (serviceType || vendorStatus) {
    vpWhere.vendorProfile = {
      ...(serviceType && { serviceType }),
      ...(vendorStatus && { vendorStatus }),
    };
  }
  const skip = (page - 1) * limit;
  const [vendors, total] = await Promise.all([
    prisma.user.findMany({ where: { ...where, ...vpWhere }, skip, take: limit, orderBy: { name: 'asc' }, include: { vendorProfile: true } }),
    prisma.user.count({ where: { ...where, ...vpWhere } }),
  ]);
  res.json({ status: 'success', data: vendors.map(safeUser), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const getVendorById = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const vendor = await prisma.user.findFirst({ where: { id, role: 'vendor' }, include: { vendorProfile: true } });
  if (!vendor) throw new AppError('Vendor not found', 404);
  res.json({ status: 'success', data: { vendor: safeUser(vendor) } });
});

export const createVendor = asyncHandler(async (req, res) => {
  const { name, email, phone, businessName, serviceType, businessRegistrationNumber,
    taxIdentificationNumber, address, contactPerson, bankDetails } = parseOrThrow(createVendorSchema, req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('User with this email already exists', 400);

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);

  const vendor = await prisma.user.create({
    data: {
      name, email, phone: phone || null,
      password: hashed, role: 'vendor',
      createdById: req.user.id,
      isTempPassword: true, mustChangePassword: true,
      vendorProfile: {
        create: {
          businessName: businessName || null,
          serviceType: serviceType || null,
          businessRegistrationNumber: businessRegistrationNumber || null,
          taxIdentificationNumber: taxIdentificationNumber || null,
          addressStreet: address?.street || null,
          addressCity: address?.city || null,
          addressState: address?.state || null,
          addressZipCode: address?.zipCode || null,
          addressCountry: address?.country || null,
          contactPersonName: contactPerson?.name || null,
          contactPersonPhone: contactPerson?.phone || null,
          contactPersonEmail: contactPerson?.email || null,
          contactPersonDesignation: contactPerson?.designation || null,
          bankAccountName: bankDetails?.accountName || null,
          bankAccountNumber: bankDetails?.accountNumber || null,
          bankName: bankDetails?.bankName || null,
          bankBranchName: bankDetails?.branchName || null,
          bankIfscCode: bankDetails?.ifscCode || null,
          bankSwiftCode: bankDetails?.swiftCode || null,
        },
      },
    },
    include: { vendorProfile: true },
  });
  res.status(201).json({ status: 'success', data: { vendor: safeUser(vendor), tempPassword } });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const { name, phone, businessName, serviceType, address, contactPerson, bankDetails, taxIdentificationNumber } = parseOrThrow(updateVendorSchema, req.body);
  const vendor = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }), ...(phone !== undefined && { phone }),
      vendorProfile: {
        update: {
          ...(businessName !== undefined && { businessName }),
          ...(serviceType && { serviceType }),
          ...(taxIdentificationNumber !== undefined && { taxIdentificationNumber }),
          ...(address?.street !== undefined && { addressStreet: address.street }),
          ...(address?.city !== undefined && { addressCity: address.city }),
          ...(address?.country !== undefined && { addressCountry: address.country }),
          ...(contactPerson?.name !== undefined && { contactPersonName: contactPerson.name }),
          ...(bankDetails?.accountNumber !== undefined && { bankAccountNumber: bankDetails.accountNumber }),
        },
      },
    },
    include: { vendorProfile: true },
  });
  res.json({ status: 'success', data: { vendor: safeUser(vendor) } });
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const vendor = await prisma.user.findFirst({ where: { id, role: 'vendor' } });
  if (!vendor) throw new AppError('Vendor not found', 404);
  await prisma.user.delete({ where: { id } });
  res.json({ status: 'success', data: {} });
});

export const getVendorStats = asyncHandler(async (req, res) => {
  const [total, active, byService] = await Promise.all([
    prisma.user.count({ where: { role: 'vendor' } }),
    prisma.user.count({ where: { role: 'vendor', isActive: true } }),
    prisma.vendorProfile.groupBy({ by: ['serviceType'], _count: true }),
  ]);
  res.json({ status: 'success', data: { total, active, inactive: total - active, byServiceType: byService } });
});

export const toggleVendorStatus = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const vendor = await prisma.user.findFirst({ where: { id, role: 'vendor' } });
  if (!vendor) throw new AppError('Vendor not found', 404);
  const updated = await prisma.user.update({ where: { id }, data: { isActive: !vendor.isActive } });
  res.json({ status: 'success', data: { vendor: safeUser(updated) } });
});

export const resetVendorPassword = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed, isTempPassword: true, mustChangePassword: true } });
  res.json({ status: 'success', message: 'Password reset', data: { tempPassword } });
});

export const getVendorPerformance = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const vendor = await prisma.user.findFirst({ where: { id, role: 'vendor' }, include: { vendorProfile: true } });
  if (!vendor) throw new AppError('Vendor not found', 404);
  res.json({ status: 'success', data: { vendorId: id, profile: vendor.vendorProfile } });
});

export const updateVendorStatus = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const { vendorStatus } = parseOrThrow(updateVendorStatusSchema, req.body);
  const profile = await prisma.vendorProfile.update({ where: { userId: id }, data: { vendorStatus } });
  res.json({ status: 'success', data: { vendorProfile: profile } });
});

export const updateVendorRating = asyncHandler(async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params);
  const { rating } = parseOrThrow(updateVendorRatingSchema, req.body);
  const profile = await prisma.vendorProfile.update({ where: { userId: id }, data: { rating } });
  res.json({ status: 'success', data: { vendorProfile: profile } });
});

export const getVendorsByServiceType = asyncHandler(async (req, res) => {
  const { serviceType } = parseOrThrow(serviceTypeParamSchema, req.params);
  const vendors = await prisma.user.findMany({
    where: { role: 'vendor', vendorProfile: { serviceType } },
    include: { vendorProfile: true },
  });
  res.json({ status: 'success', count: vendors.length, data: vendors.map(safeUser) });
});
