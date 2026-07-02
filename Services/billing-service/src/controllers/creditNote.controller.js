import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { nextCreditNoteNumber, nextVoucherNumber } from '../utils/docNumber.js';

const creditNoteInclude = { items: true };

export const getAllCreditNotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.creditNote.findMany({ where, include: creditNoteInclude, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.creditNote.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getCreditNoteById = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.findUnique({ where: { id: req.params.id }, include: creditNoteInclude });
  if (!cn) throw new AppError('Credit note not found', 404);
  res.json({ success: true, data: cn });
});

export const getCreditNoteByLeadId = asyncHandler(async (req, res) => {
  const data = await prisma.creditNote.findMany({ where: { leadId: req.params.leadId }, include: creditNoteInclude, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
});

export const getCreditNoteByInvoiceId = asyncHandler(async (req, res) => {
  const data = await prisma.creditNote.findMany({ where: { invoiceId: req.params.invoiceId }, include: creditNoteInclude, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
});

export const createCreditNote = asyncHandler(async (req, res) => {
  const { items = [], ...body } = req.body;
  const creditNoteNumber = await nextCreditNoteNumber();
  const subtotal = items.reduce((s, i) => s + Number(i.creditAmount) * Number(i.quantity || 1), 0);
  const taxAmount = subtotal * ((body.taxRate || 0) / 100);

  const cn = await prisma.creditNote.create({
    data: {
      ...body,
      creditNoteNumber,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      createdById: req.user.id,
      items: { create: items.map((item, idx) => ({ ...item, order: idx })) },
    },
    include: creditNoteInclude,
  });
  res.status(201).json({ success: true, data: cn });
});

export const updateCreditNote = asyncHandler(async (req, res) => {
  const existing = await prisma.creditNote.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Credit note not found', 404);
  const { items, ...body } = req.body;
  const data = { ...body, lastModifiedById: req.user.id };
  if (items) {
    await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: req.params.id } });
    data.items = { create: items.map((item, idx) => ({ ...item, order: idx })) };
  }
  const cn = await prisma.creditNote.update({ where: { id: req.params.id }, data, include: creditNoteInclude });
  res.json({ success: true, data: cn });
});

export const issueCreditNote = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.update({ where: { id: req.params.id }, data: { status: 'issued', issueDate: new Date() }, include: creditNoteInclude });
  res.json({ success: true, data: cn });
});

export const approveCreditNote = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.update({ where: { id: req.params.id }, data: { approvedAt: new Date(), approvedById: req.user.id }, include: creditNoteInclude });
  res.json({ success: true, data: cn });
});

export const rejectCreditNote = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.update({ where: { id: req.params.id }, data: { rejectedAt: new Date(), rejectedById: req.user.id, rejectionReason: req.body.reason }, include: creditNoteInclude });
  res.json({ success: true, data: cn });
});

export const applyCreditNote = asyncHandler(async (req, res) => {
  const existing = await prisma.creditNote.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Credit note not found', 404);
  if (existing.appliedToInvoice) throw new AppError('Credit note already applied', 400);

  await prisma.invoice.update({
    where: { id: existing.invoiceId },
    data: { outstandingAmount: { decrement: existing.totalAmount } },
  });
  const cn = await prisma.creditNote.update({ where: { id: req.params.id }, data: { status: 'applied', appliedToInvoice: true, appliedAt: new Date() }, include: creditNoteInclude });
  res.json({ success: true, data: cn });
});

export const processCreditNoteRefund = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.update({
    where: { id: req.params.id },
    data: { status: 'refunded', refundStatus: 'completed', refundMethod: req.body.refundMethod, refundTransactionId: req.body.transactionId, refundProcessedAt: new Date(), refundNotes: req.body.notes },
    include: creditNoteInclude,
  });
  res.json({ success: true, data: cn });
});

export const generateVoucherFromCreditNote = asyncHandler(async (req, res) => {
  const existing = await prisma.creditNote.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Credit note not found', 404);
  const voucherCode = `VOC-${Date.now()}`;
  const cn = await prisma.creditNote.update({
    where: { id: req.params.id },
    data: { voucherGenerated: true, voucherCode, voucherValue: existing.totalAmount, voucherExpiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null },
    include: creditNoteInclude,
  });
  res.json({ success: true, data: cn });
});

export const cancelCreditNote = asyncHandler(async (req, res) => {
  const cn = await prisma.creditNote.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body.reason, cancelledById: req.user.id },
    include: creditNoteInclude,
  });
  res.json({ success: true, data: cn });
});

export const sendCreditNote = asyncHandler(async (req, res) => {
  await prisma.creditNote.update({ where: { id: req.params.id }, data: { sentAt: new Date(), emailSent: true } });
  res.json({ success: true, message: 'Credit note sent' });
});

export const getCreditNoteStats = asyncHandler(async (req, res) => {
  const [total, issued, applied, refunded] = await Promise.all([
    prisma.creditNote.count(),
    prisma.creditNote.count({ where: { status: 'issued' } }),
    prisma.creditNote.count({ where: { status: 'applied' } }),
    prisma.creditNote.count({ where: { status: 'refunded' } }),
  ]);
  const totalValue = await prisma.creditNote.aggregate({ _sum: { totalAmount: true } });
  res.json({ success: true, data: { total, issued, applied, refunded, totalValue: totalValue._sum.totalAmount || 0 } });
});
