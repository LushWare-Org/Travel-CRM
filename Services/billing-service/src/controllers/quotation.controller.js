import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { nextQuotationNumber, nextInvoiceNumber } from '../utils/docNumber.js';
import { quotationTotals, createOrVersionQuotation } from '../services/quotation.service.js';
import { emitLeadEvent } from '../services/events.client.js';

const quotationInclude = {
  items: { orderBy: { order: 'asc' } },
  images: true,
  revisionHistory: { orderBy: { modifiedAt: 'desc' } },
};

export const getAllQuotations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { ...(status && { status }) };

  const [data, total] = await Promise.all([
    prisma.quotation.findMany({ where, include: quotationInclude, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.quotation.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
  if (!quotation) throw new AppError('Quotation not found', 404);
  res.json({ success: true, data: quotation });
});

export const getQuotationsByLeadId = asyncHandler(async (req, res) => {
  const data = await prisma.quotation.findMany({
    where: { leadId: req.params.leadId },
    include: quotationInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data });
});

export const createQuotation = asyncHandler(async (req, res) => {
  const { items = [], images = [], ...body } = req.body;
  const quotationNumber = await nextQuotationNumber();

  const totals = quotationTotals(items, {
    taxRate: body.taxRate,
    serviceChargeRate: body.serviceChargeRate,
    discountType: body.discountType,
    discountValue: body.discountValue,
  });

  const quotation = await prisma.quotation.create({
    data: {
      ...body,
      quotationNumber,
      ...totals,
      createdById: req.user.id,
      items: { create: items.map((item, idx) => ({ ...item, totalPrice: item.unitPrice * item.quantity, order: idx })) },
      images: { create: images },
    },
    include: quotationInclude,
  });
  res.status(201).json({ success: true, data: quotation });
});

export const updateQuotation = asyncHandler(async (req, res) => {
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Quotation not found', 404);
  if (['converted', 'accepted'].includes(existing.status)) throw new AppError('Cannot update this quotation', 400);

  const {
    items, images, lead: _lead, createdBy: _cb,
    lastModifiedBy: _lmb, revisionHistory: _rev,
    ...body
  } = req.body;
  const data = { ...body, lastModifiedById: req.user.id, version: { increment: 1 } };

  if (items) {
    const totals = quotationTotals(items, {
      taxRate: body.taxRate ?? existing.taxRate,
      serviceChargeRate: body.serviceChargeRate ?? existing.serviceChargeRate,
      discountType: body.discountType ?? existing.discountType,
      discountValue: body.discountValue ?? existing.discountValue,
    });
    Object.assign(data, totals);
    await prisma.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
    data.items = { create: items.map((item, idx) => ({ ...item, totalPrice: item.unitPrice * item.quantity, order: idx })) };
  }

  const rev = { version: existing.version, modifiedById: req.user.id, changes: JSON.stringify(body) };
  data.revisionHistory = { create: rev };

  const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data, include: quotationInclude });
  res.json({ success: true, data: quotation });
});

/**
 * POST /api/v1/billing/quotations/from-lead
 * Lead-service snapshot handoff: create version 1 or bump the version of the
 * lead's existing quotation. Validates totals against the shared engine.
 */
export const createQuotationFromLead = asyncHandler(async (req, res) => {
  const quotation = await createOrVersionQuotation({
    ...req.body,
    createdById: req.user.id,
  });
  res.status(201).json({ success: true, data: quotation });
});

export const deleteQuotation = asyncHandler(async (req, res) => {
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Quotation not found', 404);
  await prisma.quotation.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Quotation deleted' });
});

export const sendQuotation = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data: { status: 'sent', sentAt: new Date(), emailSent: true },
  });
  res.json({ success: true, message: 'Quotation sent', data: quotation });
});

export const markQuotationViewed = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data: { status: 'viewed', viewedAt: new Date() },
  });
  res.json({ success: true, data: quotation });
});

export const acceptQuotation = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data: { status: 'accepted', acceptedAt: new Date() },
  });
  try {
    await emitLeadEvent({
      type: 'quotation.accepted',
      leadId: quotation.leadId,
      payload: { quoteId: quotation.id, version: quotation.version },
    });
  } catch (err) {
    console.error('Failed to notify lead-service of acceptance', err.message);
  }
  res.json({ success: true, data: quotation });
});

export const rejectQuotation = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: req.body.reason },
  });
  try {
    await emitLeadEvent({
      type: 'quotation.rejected',
      leadId: quotation.leadId,
      payload: { quoteId: quotation.id, reason: req.body.reason || null },
    });
  } catch (err) {
    console.error('Failed to notify lead-service of rejection', err.message);
  }
  res.json({ success: true, data: quotation });
});

export const convertQuotationToInvoice = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!quotation) throw new AppError('Quotation not found', 404);
  if (quotation.status === 'converted') throw new AppError('Already converted', 400);

  const invoiceNumber = await nextInvoiceNumber();
  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 30 * 86400000);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      leadId: quotation.leadId,
      quotationId: quotation.id,
      createdById: req.user.id,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      discountType: quotation.discountType,
      discountValue: quotation.discountValue,
      discountAmount: quotation.discountAmount,
      serviceChargeRate: quotation.serviceChargeRate,
      serviceChargeAmount: quotation.serviceChargeAmount,
      totalAmount: quotation.totalAmount,
      outstandingAmount: quotation.totalAmount,
      dueDate,
      notes: quotation.notes,
      terms: quotation.terms,
      items: { create: quotation.items.map(({ id, quotationId, ...item }) => item) },
    },
    include: { items: true },
  });

  await prisma.quotation.update({
    where: { id: req.params.id },
    data: { status: 'converted', convertedToInvoiceId: invoice.id },
  });

  res.status(201).json({ success: true, data: invoice });
});

export const getQuotationStats = asyncHandler(async (req, res) => {
  const [total, pending, accepted, rejected, converted] = await Promise.all([
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: { in: ['sent', 'viewed'] } } }),
    prisma.quotation.count({ where: { status: 'accepted' } }),
    prisma.quotation.count({ where: { status: 'rejected' } }),
    prisma.quotation.count({ where: { status: 'converted' } }),
  ]);
  res.json({ success: true, data: { total, pending, accepted, rejected, converted } });
});

export const downloadQuotationPDF = asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
  if (!quotation) throw new AppError('Quotation not found', 404);
  res.json({ success: true, message: 'PDF generation not yet implemented', data: quotation });
});
