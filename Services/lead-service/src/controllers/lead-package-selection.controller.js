import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createPackageSelectionSchema, addOptionalFlightSchema } from '../validators/lead.validator.js';
import { validateTransition } from '../services/state-machine.service.js';
import { gatekeeperInputs } from '../services/gatekeeper.service.js';
import { fetchPackage } from '../services/lead-draft.service.js';
import {
  deriveSelectionView,
  toEditorDays,
  isSelectionMaterialized,
  materializeSelection,
  refreshSelection,
  recomputeSelectionPricing,
  snapshotSelectionQuotation,
} from '../services/lead-selection.service.js';
import {
  applyLeadSelectionItinerary,
  serializeLeadDays,
  buildAutoCostLines,
  EDIT_BLOCKED_STATUSES,
} from '../services/lead-itinerary.service.js';
import { computePricing, toLineDescriptor } from '../services/pricing.service.js';

const FULL_SELECTION_INCLUDE = {
  pricing: true,
  costLines: { orderBy: { orderIndex: 'asc' } },
  itineraryDays: {
    orderBy: { dayNumber: 'asc' },
    include: { places: true, activities: true, transports: true },
  },
  optionalFlights: true,
};

async function loadOwnedSelection(leadId, selectionId, include = {}) {
  const selection = await prisma.leadPackageSelection.findUnique({ where: { id: selectionId }, include });
  if (!selection || selection.leadId !== leadId) {
    throw new AppError('Package selection not found', 404);
  }
  return selection;
}

async function presentSelection(selection) {
  const isMaterialized = selection.itineraryDays.length > 0 || Boolean(selection.pricing);
  if (isMaterialized) {
    return { ...selection, itineraryDays: serializeLeadDays(selection), isMaterialized: true };
  }
  try {
    const derived = await deriveSelectionView({ selection });
    return {
      ...selection,
      itineraryDays: toEditorDays(derived.days),
      costLines: derived.costLines,
      pricing: derived.pricing,
      isMaterialized: false,
    };
  } catch {
    // package-service unreachable for this selection — degrade gracefully
    // rather than failing the whole list/response.
    return { ...selection, itineraryDays: [], costLines: [], pricing: null, isMaterialized: false, derivationError: true };
  }
}

// ─── Selection CRUD ─────────────────────────────────────────────

export const listPackageSelections = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const selections = await prisma.leadPackageSelection.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'asc' },
    include: FULL_SELECTION_INCLUDE,
  });

  const results = await Promise.all(selections.map(presentSelection));
  res.json({ success: true, data: results });
});

export const getPackageSelection = asyncHandler(async (req, res) => {
  const selection = await loadOwnedSelection(req.params.id, req.params.selectionId, FULL_SELECTION_INCLUDE);
  res.json({ success: true, data: await presentSelection(selection) });
});

export const createPackageSelection = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const parsed = createPackageSelectionSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new AppError(messages, 400);
  }
  const { packageId, isManual } = parsed.data;

  if (isManual) {
    const existingManual = await prisma.leadPackageSelection.findFirst({ where: { leadId: lead.id, isManual: true } });
    if (existingManual) throw new AppError('Lead already has a manual itinerary selection', 400);
  } else {
    const existingPackage = await prisma.leadPackageSelection.findFirst({ where: { leadId: lead.id, packageId } });
    if (existingPackage) throw new AppError('This package is already attached to the lead', 400);
  }

  let packageName = null;
  if (!isManual) {
    try {
      const pkg = await fetchPackage(packageId);
      packageName = pkg.title || null;
    } catch {
      // package-service unreachable — selection still created; the name
      // snapshot is refreshed the next time this selection is materialized.
    }
  }

  const selection = await prisma.leadPackageSelection.create({
    data: { leadId: lead.id, packageId: isManual ? null : packageId, isManual: Boolean(isManual), packageName },
  });

  if (!lead.primarySelectionId) {
    await prisma.lead.update({ where: { id: lead.id }, data: { primarySelectionId: selection.id } });
  }

  res.status(201).json({
    success: true,
    data: { ...selection, itineraryDays: [], costLines: [], optionalFlights: [], pricing: null, isMaterialized: false },
  });
});

export const deletePackageSelection = asyncHandler(async (req, res) => {
  const selection = await loadOwnedSelection(req.params.id, req.params.selectionId);
  await prisma.leadPackageSelection.delete({ where: { id: selection.id } });

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (lead && lead.primarySelectionId === selection.id) {
    const next = await prisma.leadPackageSelection.findFirst({
      where: { leadId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.lead.update({ where: { id: req.params.id }, data: { primarySelectionId: next?.id ?? null } });
  }
  res.json({ success: true, data: {} });
});

// ─── Itinerary / refresh / quote ────────────────────────────────

export const updateSelectionItinerary = asyncHandler(async (req, res) => {
  const { days, pricing } = req.body;
  if (!Array.isArray(days)) throw new AppError('days array is required', 400);

  await loadOwnedSelection(req.params.id, req.params.selectionId);

  const result = await applyLeadSelectionItinerary({
    leadId: req.params.id,
    selectionId: req.params.selectionId,
    days,
    pricingSettings: pricing || {},
    actorId: req.user.id,
  });

  const selection = await prisma.leadPackageSelection.findUnique({
    where: { id: req.params.selectionId },
    include: FULL_SELECTION_INCLUDE,
  });

  res.json({
    success: true,
    data: { ...result, selection: { ...selection, itineraryDays: serializeLeadDays(selection), isMaterialized: true } },
  });
});

export const refreshPackageSelection = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  await loadOwnedSelection(req.params.id, req.params.selectionId);

  if (EDIT_BLOCKED_STATUSES.includes(lead.lifecycleStatus)) {
    throw new AppError('Itinerary edits are locked after QUOTED; move back to DRAFTING first', 400);
  }

  const force = Boolean(req.body?.force);
  const selection = await refreshSelection({ selectionId: req.params.selectionId, force });
  res.json({ success: true, data: selection });
});

export const quotePackageSelection = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  const selection = await loadOwnedSelection(req.params.id, req.params.selectionId, { pricing: true, costLines: true });

  validateTransition({
    currentStatus: lead.lifecycleStatus,
    nextStatus: 'QUOTED',
    pricing: gatekeeperInputs(selection.pricing, selection.costLines),
  });

  const quotation = await snapshotSelectionQuotation(selection.id, { createdById: req.user.id });

  const updatedSelection = await prisma.leadPackageSelection.update({
    where: { id: selection.id },
    data: { currentQuoteId: quotation.id },
  });

  const leadUpdateData = { primarySelectionId: selection.id };
  if (lead.lifecycleStatus !== 'QUOTED') {
    leadUpdateData.lifecycleStatus = 'QUOTED';
    leadUpdateData.statusHistory = {
      create: [{ status: 'QUOTED', actor: 'USER', changedById: req.user.id, notes: 'Quotation snapshot sent to billing' }],
    };
  }
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: leadUpdateData,
    include: { statusHistory: { orderBy: { changedAt: 'desc' } } },
  });

  res.json({ success: true, data: { selection: updatedSelection, lead: updatedLead, quotation } });
});

// ─── Pricing ─────────────────────────────────────────────────────

export const getSelectionPricing = asyncHandler(async (req, res) => {
  const selection = await loadOwnedSelection(req.params.id, req.params.selectionId, {
    pricing: true,
    costLines: { orderBy: { orderIndex: 'asc' } },
    optionalFlights: true,
  });
  res.json({ success: true, data: { pricing: selection.pricing, costLines: selection.costLines, optionalFlights: selection.optionalFlights } });
});

export const calculateSelectionPricing = asyncHandler(async (req, res) => {
  await loadOwnedSelection(req.params.id, req.params.selectionId);

  const { lines, days, travelers = 1, ...settings } = req.body;
  if (!Array.isArray(lines) && !Array.isArray(days)) {
    throw new AppError('lines or days array is required', 400);
  }
  let resolvedLines;
  if (Array.isArray(lines)) {
    resolvedLines = lines;
  } else {
    const autoLines = buildAutoCostLines(days).map(toLineDescriptor);
    const manualLines = await prisma.leadCostLine.findMany({
      where: { leadPackageSelectionId: req.params.selectionId, source: 'MANUAL' },
      orderBy: { orderIndex: 'asc' },
    });
    resolvedLines = [...autoLines, ...manualLines.map(toLineDescriptor)];
  }
  const computed = computePricing({ lines: resolvedLines, travelers, ...settings });
  res.json({ success: true, data: { financials: computed } });
});

export const applySelectionPricing = asyncHandler(async (req, res) => {
  const selection = await loadOwnedSelection(req.params.id, req.params.selectionId, { pricing: true });
  if (!selection.pricing) {
    throw new AppError('Selection has no pricing row; edit its itinerary first', 400);
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
      prisma.leadCostLine.deleteMany({ where: { leadPackageSelectionId: selection.id } }),
      prisma.leadCostLine.createMany({ data: rows.map((r) => ({ ...r, leadPackageSelectionId: selection.id })) }),
    ]);
  }

  if (settings && Object.keys(settings).length) {
    await prisma.leadPricing.update({
      where: { leadPackageSelectionId: selection.id },
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

  const pricing = await recomputeSelectionPricing(selection.id, verifiedPaymentTotal);
  res.json({ success: true, data: { pricing } });
});

// ─── Optional transfer flights ─────────────────────────────────

export const listSelectionFlights = asyncHandler(async (req, res) => {
  await loadOwnedSelection(req.params.id, req.params.selectionId);
  const flights = await prisma.leadOptionalFlight.findMany({
    where: { leadPackageSelectionId: req.params.selectionId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: flights });
});

export const addSelectionFlight = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  await loadOwnedSelection(req.params.id, req.params.selectionId);

  const parsed = addOptionalFlightSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new AppError(messages, 400);
  }
  const {
    flightType, origin, destination, date, cabinClass, departureTime,
    airlinePreference, notes, estimatedUnitPrice = 0, actualUnitPrice, marginType, marginValue,
  } = parsed.data;

  // Adding a rep-entered flight is itself a customization — materialize a
  // still-pristine selection first so there's a pricing row to recompute
  // into (flights are always persisted regardless of pristine/materialized
  // state, but the pricing scaffold underneath still needs to exist).
  if (!(await isSelectionMaterialized(req.params.selectionId))) {
    await materializeSelection({ selectionId: req.params.selectionId });
  }
  const selection = await prisma.leadPackageSelection.findUnique({
    where: { id: req.params.selectionId },
    include: { costLines: true },
  });

  const quantity = lead.numberOfTravelers || 1;
  const flight = await prisma.leadOptionalFlight.create({
    data: {
      leadPackageSelectionId: selection.id,
      flightType,
      origin: origin ?? null,
      destination: destination ?? null,
      date: date ? new Date(date) : null,
      cabinClass: cabinClass ?? null,
      departureTime: departureTime ?? null,
      airlinePreference: airlinePreference ?? null,
      notes: notes ?? null,
      estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
      actualUnitPrice: actualUnitPrice != null ? Number(actualUnitPrice) : null,
      quantity,
      marginType: marginType || null,
      marginValue: marginValue != null ? Number(marginValue) : null,
    },
  });

  await prisma.leadCostLine.create({
    data: {
      leadPackageSelectionId: selection.id,
      category: 'transportation',
      description: `Flight: ${origin || '?'} → ${destination || '?'}`,
      basis: 'PER_PERSON',
      quantity,
      estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
      actualUnitPrice: actualUnitPrice != null ? Number(actualUnitPrice) : null,
      marginType: marginType || null,
      marginValue: marginValue != null ? Number(marginValue) : null,
      source: 'MANUAL',
      optionalFlightId: flight.id,
      orderIndex: (selection.costLines || []).length,
    },
  });

  await recomputeSelectionPricing(selection.id);
  res.status(201).json({ success: true, data: flight });
});

export const deleteSelectionFlight = asyncHandler(async (req, res) => {
  const { id, selectionId, flightId } = req.params;
  const selection = await loadOwnedSelection(id, selectionId);
  const flight = await prisma.leadOptionalFlight.findUnique({ where: { id: flightId } });
  if (!flight || flight.leadPackageSelectionId !== selection.id) throw new AppError('Flight not found', 404);

  await prisma.$transaction([
    prisma.leadCostLine.deleteMany({ where: { leadPackageSelectionId: selection.id, optionalFlightId: flightId } }),
    prisma.leadOptionalFlight.delete({ where: { id: flightId } }),
  ]);
  await recomputeSelectionPricing(selection.id);
  res.json({ success: true, data: {} });
});
