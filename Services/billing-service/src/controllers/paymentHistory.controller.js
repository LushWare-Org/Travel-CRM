import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const getAllPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    prisma.paymentHistory.findMany({ orderBy: { paymentDate: 'desc' }, skip, take: Number(limit) }),
    prisma.paymentHistory.count(),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getPaymentHistoryById = asyncHandler(async (req, res) => {
  const record = await prisma.paymentHistory.findUnique({ where: { id: req.params.id } });
  if (!record) throw new AppError('Payment history record not found', 404);
  res.json({ success: true, data: record });
});

export const getPaymentHistoryByLeadId = asyncHandler(async (req, res) => {
  const data = await prisma.paymentHistory.findMany({
    where: { leadId: req.params.leadId },
    orderBy: { paymentDate: 'desc' },
  });
  res.json({ success: true, data });
});

export const downloadPaymentHistoryPDF = asyncHandler(async (req, res) => {
  const record = await prisma.paymentHistory.findUnique({ where: { id: req.params.id } });
  if (!record) throw new AppError('Payment history record not found', 404);
  res.json({ success: true, message: 'PDF generation not yet implemented', data: record });
});

export const downloadPaymentHistoryListPDF = asyncHandler(async (req, res) => {
  const { leadId } = req.query;
  const where = leadId ? { leadId } : {};
  const data = await prisma.paymentHistory.findMany({ where, orderBy: { paymentDate: 'desc' } });
  res.json({ success: true, message: 'PDF generation not yet implemented', data });
});
