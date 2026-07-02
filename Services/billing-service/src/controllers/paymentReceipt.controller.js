import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { nextReceiptNumber, nextPaymentHistoryNumber } from '../utils/docNumber.js';

const receiptInclude = { paymentHistories: true };

export const getAllPaymentReceipts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { ...(status && { receiptStatus: status }) };
  const [data, total] = await Promise.all([
    prisma.paymentReceipt.findMany({ where, include: receiptInclude, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.paymentReceipt.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getPaymentReceiptById = asyncHandler(async (req, res) => {
  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: req.params.id }, include: receiptInclude });
  if (!receipt) throw new AppError('Payment receipt not found', 404);
  res.json({ success: true, data: receipt });
});

export const getPaymentReceiptsByLeadId = asyncHandler(async (req, res) => {
  const data = await prisma.paymentReceipt.findMany({
    where: { leadId: req.params.leadId },
    include: receiptInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data });
});

export const getPaymentReceiptsByInvoiceId = asyncHandler(async (req, res) => {
  const data = await prisma.paymentReceipt.findMany({
    where: { invoiceId: req.params.invoiceId },
    include: receiptInclude,
    orderBy: { paymentDate: 'desc' },
  });
  res.json({ success: true, data });
});

export const createPaymentReceipt = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.body.invoiceId } });
  if (!invoice) throw new AppError('Invoice not found', 404);

  const receiptNumber = await nextReceiptNumber();
  const paymentHistoryNumber = await nextPaymentHistoryNumber();
  const amount = Number(req.body.amount);
  const previousBalance = invoice.outstandingAmount;
  const outstandingBalance = Math.max(0, previousBalance - amount);

  const receipt = await prisma.paymentReceipt.create({
    data: {
      ...req.body,
      receiptNumber,
      amount,
      previousBalance,
      outstandingBalance,
      createdById: req.user.id,
      paymentHistories: {
        create: {
          paymentHistoryNumber,
          leadId: req.body.leadId || invoice.leadId,
          invoiceId: req.body.invoiceId,
          customerName: req.body.customerName || invoice.customerName,
          customerEmail: req.body.customerEmail || invoice.customerEmail,
          customerPhone: req.body.customerPhone,
          amount,
          currency: req.body.currency || 'LKR',
          paymentMethod: req.body.paymentMethod,
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
          transactionId: req.body.transactionId,
          paymentType: req.body.paymentType || 'installment',
          notes: req.body.notes,
          createdById: req.user.id,
        },
      },
    },
    include: receiptInclude,
  });

  // Update invoice paid and outstanding amounts
  const newPaid = invoice.paidAmount + amount;
  const newOutstanding = Math.max(0, invoice.totalAmount - newPaid);
  const paymentStatus = newOutstanding <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
  await prisma.invoice.update({
    where: { id: req.body.invoiceId },
    data: { paidAmount: newPaid, outstandingAmount: newOutstanding, paymentStatus },
  });

  res.status(201).json({ success: true, data: receipt });
});

export const updatePaymentReceipt = asyncHandler(async (req, res) => {
  const existing = await prisma.paymentReceipt.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Payment receipt not found', 404);
  const receipt = await prisma.paymentReceipt.update({
    where: { id: req.params.id },
    data: { ...req.body, lastModifiedById: req.user.id },
    include: receiptInclude,
  });
  res.json({ success: true, data: receipt });
});

export const cancelPaymentReceipt = asyncHandler(async (req, res) => {
  const existing = await prisma.paymentReceipt.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Payment receipt not found', 404);
  if (existing.receiptStatus === 'cancelled') throw new AppError('Already cancelled', 400);

  const receipt = await prisma.paymentReceipt.update({
    where: { id: req.params.id },
    data: { receiptStatus: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body.reason, cancelledById: req.user.id },
    include: receiptInclude,
  });
  res.json({ success: true, data: receipt });
});

export const verifyPaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await prisma.paymentReceipt.update({
    where: { id: req.params.id },
    data: { verified: true, verifiedAt: new Date(), verifiedById: req.user.id },
    include: receiptInclude,
  });
  res.json({ success: true, data: receipt });
});

export const reconcilePaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await prisma.paymentReceipt.update({
    where: { id: req.params.id },
    data: { reconciled: true, reconciledAt: new Date(), reconciledById: req.user.id },
    include: receiptInclude,
  });
  res.json({ success: true, data: receipt });
});

export const sendPaymentReceipt = asyncHandler(async (req, res) => {
  await prisma.paymentReceipt.update({
    where: { id: req.params.id },
    data: { sentAt: new Date(), emailSent: true },
  });
  res.json({ success: true, message: 'Payment receipt sent' });
});

export const getPaymentReceiptStats = asyncHandler(async (req, res) => {
  const [total, verified, reconciled] = await Promise.all([
    prisma.paymentReceipt.count({ where: { receiptStatus: { not: 'cancelled' } } }),
    prisma.paymentReceipt.count({ where: { verified: true } }),
    prisma.paymentReceipt.count({ where: { reconciled: true } }),
  ]);
  const totalCollected = await prisma.paymentReceipt.aggregate({
    _sum: { amount: true },
    where: { receiptStatus: { not: 'cancelled' } },
  });
  res.json({ success: true, data: { total, verified, reconciled, totalCollected: totalCollected._sum.amount || 0 } });
});

export const downloadPaymentReceiptPDF = asyncHandler(async (req, res) => {
  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: req.params.id }, include: receiptInclude });
  if (!receipt) throw new AppError('Payment receipt not found', 404);
  res.json({ success: true, message: 'PDF generation not yet implemented', data: receipt });
});
