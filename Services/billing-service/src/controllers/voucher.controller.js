import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { nextVoucherNumber } from '../utils/docNumber.js';

const voucherInclude = {
  locationDates: { orderBy: { order: 'asc' } },
  mealPlans: { orderBy: { dayNumber: 'asc' } },
  itinerarySummary: { orderBy: { order: 'asc' } },
};

export const getAllVouchers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.voucher.findMany({ where, include: voucherInclude, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.voucher.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getVoucherById = asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id }, include: voucherInclude });
  if (!voucher) throw new AppError('Voucher not found', 404);
  res.json({ success: true, data: voucher });
});

export const getVouchersByLeadId = asyncHandler(async (req, res) => {
  const data = await prisma.voucher.findMany({ where: { leadId: req.params.leadId }, include: voucherInclude, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
});

export const createVoucher = asyncHandler(async (req, res) => {
  const { locationDates = [], mealPlans = [], itinerarySummary = [], ...body } = req.body;
  const voucherNumber = await nextVoucherNumber();

  const voucher = await prisma.voucher.create({
    data: {
      ...body,
      voucherNumber,
      createdById: req.user.id,
      locationDates: { create: locationDates.map((l, idx) => ({ ...l, order: idx })) },
      mealPlans: { create: mealPlans },
      itinerarySummary: { create: itinerarySummary.map((s, idx) => ({ ...s, order: idx })) },
    },
    include: voucherInclude,
  });
  res.status(201).json({ success: true, data: voucher });
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const existing = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Voucher not found', 404);
  if (existing.status === 'cancelled') throw new AppError('Cannot update a cancelled voucher', 400);

  const {
    locationDates, mealPlans, itinerarySummary,
    lead: _lead, createdBy: _cb, lastModifiedBy: _lmb,
    ...body
  } = req.body;
  const data = { ...body, lastModifiedById: req.user.id };

  if (locationDates) {
    await prisma.voucherLocationDate.deleteMany({ where: { voucherId: req.params.id } });
    data.locationDates = { create: locationDates.map((l, idx) => ({ ...l, order: idx })) };
  }
  if (mealPlans) {
    await prisma.voucherMealPlan.deleteMany({ where: { voucherId: req.params.id } });
    data.mealPlans = { create: mealPlans };
  }
  if (itinerarySummary) {
    await prisma.voucherItinerarySummary.deleteMany({ where: { voucherId: req.params.id } });
    data.itinerarySummary = { create: itinerarySummary.map((s, idx) => ({ ...s, order: idx })) };
  }

  const voucher = await prisma.voucher.update({ where: { id: req.params.id }, data, include: voucherInclude });
  res.json({ success: true, data: voucher });
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const existing = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Voucher not found', 404);
  await prisma.voucher.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Voucher deleted' });
});

export const sendVoucherEmail = asyncHandler(async (req, res) => {
  await prisma.voucher.update({ where: { id: req.params.id }, data: { status: 'sent', emailSent: true, emailSentAt: new Date() } });
  res.json({ success: true, message: 'Voucher sent' });
});

export const markVoucherViewed = asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.update({ where: { id: req.params.id }, data: { status: 'viewed', viewedAt: new Date() } });
  res.json({ success: true, data: voucher });
});

export const confirmVoucher = asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.update({ where: { id: req.params.id }, data: { status: 'confirmed', confirmedAt: new Date() } });
  res.json({ success: true, data: voucher });
});

export const downloadVoucherPDF = asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id }, include: voucherInclude });
  if (!voucher) throw new AppError('Voucher not found', 404);
  res.json({ success: true, message: 'PDF generation not yet implemented', data: voucher });
});
