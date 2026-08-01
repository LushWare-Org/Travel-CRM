import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computeFinancials } from '../services/pricing.service.js';

/**
 * POST /api/v1/leads/:id/pricing/calculate
 * Compute pricing without persisting (dry-run/preview).
 */
export const calculatePricing = asyncHandler(async (req, res) => {
  const { financials } = req.body;
  if (!financials) {
    throw new AppError('financials object is required', 400);
  }
  const computed = computeFinancials(financials);
  res.json({ success: true, data: { financials: computed } });
});

/**
 * POST /api/v1/leads/:id/pricing/apply
 * Compute AND persist pricing to the lead record.
 */
export const applyPricing = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const { financials } = req.body;
  if (!financials) {
    throw new AppError('financials object is required', 400);
  }

  const computed = computeFinancials(financials);

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { financials: computed },
  });

  res.json({ success: true, data: { financials: updated.financials } });
});
