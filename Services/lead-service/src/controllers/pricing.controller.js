import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computePricing, toLineDescriptor } from '../services/pricing.service.js';
import { recomputeLeadPricing } from './lead.controller.js';
import { buildAutoCostLines } from '../services/lead-itinerary.service.js';

/**
 * GET /api/v1/leads/:id/pricing — pricing row, cost lines and flights.
 */
export const getLeadPricing = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      pricing: true,
      costLines: { orderBy: { orderIndex: 'asc' } },
      optionalFlights: true,
    },
  });
  if (!lead) throw new AppError('Lead not found', 404);
  res.json({
    success: true,
    data: {
      pricing: lead.pricing,
      costLines: lead.costLines,
      optionalFlights: lead.optionalFlights,
    },
  });
});

/**
 * POST /api/v1/leads/:id/pricing/calculate — dry-run preview, nothing persisted.
 */
export const calculatePricing = asyncHandler(async (req, res) => {
  const { lines, days, travelers = 1, ...settings } = req.body;
  const resolvedLines = Array.isArray(lines)
    ? lines
    : Array.isArray(days)
      ? buildAutoCostLines(days).map(toLineDescriptor)
      : [];
  if (!Array.isArray(lines) && !Array.isArray(days)) {
    throw new AppError('lines or days array is required', 400);
  }
  const computed = computePricing({ lines: resolvedLines, travelers, ...settings });
  res.json({ success: true, data: { financials: computed } });
});

/**
 * POST /api/v1/leads/pricing/preview — standalone preview for the new-lead
 * dialog (no lead exists yet). Same engine, nothing persisted.
 */
export const previewPricing = asyncHandler(async (req, res) => {
  const { lines, days, travelers = 1, ...settings } = req.body;
  const resolvedLines = Array.isArray(lines)
    ? lines
    : Array.isArray(days)
      ? buildAutoCostLines(days).map(toLineDescriptor)
      : [];
  if (!Array.isArray(lines) && !Array.isArray(days)) {
    throw new AppError('lines or days array is required', 400);
  }
  const computed = computePricing({ lines: resolvedLines, travelers, ...settings });
  res.json({ success: true, data: { financials: computed } });
});

/**
 * POST /api/v1/leads/:id/pricing/apply — replace lines/settings and persist
 * recomputed totals. MANUAL flags travel with the lines; recompute never
 * touches values the client sent (engine recalculates from them).
 */
export const applyPricing = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { pricing: true },
  });
  if (!lead) throw new AppError('Lead not found', 404);
  if (!lead.pricing) {
    throw new AppError('Lead has no pricing row; create the draft first', 400);
  }

  const { settings = {}, lines, verifiedPaymentTotal } = req.body;

  if (lines !== undefined) {
    if (!Array.isArray(lines)) throw new AppError('lines must be an array', 400);
    const rows = lines.map((line, i) => ({
      category: line.category || 'other',
      description: line.description || '',
      basis: line.basis || 'FIXED',
      quantity: Number(line.quantity) || 1,
      estimatedUnitPrice: Number(line.estimatedUnitPrice) || 0,
      actualUnitPrice: line.actualUnitPrice != null ? Number(line.actualUnitPrice) : null,
      marginType: line.marginType || null,
      marginValue: line.marginValue != null ? Number(line.marginValue) : null,
      source: line.source || 'MANUAL',
      dayNumber: line.dayNumber ?? null,
      flightBookingId: line.flightBookingId ?? null,
      optionalFlightId: line.optionalFlightId ?? null,
      orderIndex: line.orderIndex ?? i,
    }));
    await prisma.$transaction([
      prisma.leadCostLine.deleteMany({ where: { leadId: lead.id } }),
      prisma.leadCostLine.createMany({ data: rows.map((r) => ({ ...r, leadId: lead.id })) }),
    ]);
  }

  if (settings && Object.keys(settings).length) {
    await prisma.leadPricing.update({
      where: { leadId: lead.id },
      data: {
        currency: settings.currency,
        marginType: settings.marginType,
        marginValue: settings.marginValue,
        depositType: settings.depositType,
        depositValue: settings.depositValue,
        discountType: settings.discountType,
        discountValue: settings.discountValue,
        serviceChargeRate: settings.serviceChargeRate,
      },
    });
  }

  const pricing = await recomputeLeadPricing(lead.id, verifiedPaymentTotal);
  res.json({ success: true, data: { pricing } });
});
