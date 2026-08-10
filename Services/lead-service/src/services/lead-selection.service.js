import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import { fetchPackage, buildDraftData } from './lead-draft.service.js';
import { computePricing, toLineDescriptor } from './pricing.service.js';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3006';

/**
 * A selection's children (itineraryDays/pricing) are lazy — a "pristine"
 * selection has none persisted and is derived from the live package on read.
 */
export async function isSelectionMaterialized(selectionId, prismaClient = prisma) {
  const [dayCount, pricingRow] = await Promise.all([
    prismaClient.leadItineraryDay.count({ where: { leadPackageSelectionId: selectionId } }),
    prismaClient.leadPricing.findUnique({ where: { leadPackageSelectionId: selectionId } }),
  ]);
  return dayCount > 0 || Boolean(pricingRow);
}

function createDefaultManualDay() {
  return {
    dayNumber: 1,
    title: null,
    description: null,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0,
    mealPriceOverride: null,
    accommodation: {},
    flights: [],
    places: { create: [] },
    activities: { create: [] },
    transports: { create: [] },
  };
}

/**
 * Adapts the nested Prisma create-shaped days (from buildDraftData /
 * createDefaultManualDay — `places: {create:[...]}` etc.) into the same flat
 * editor-day shape `serializeLeadDays` produces from persisted rows, so a
 * derived (not-yet-persisted) view and a materialized view are
 * interchangeable from the API's perspective. Derived rows have no `id`.
 */
export function toEditorDays(days) {
  return (days || []).map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    breakfastCount: day.breakfastCount,
    lunchCount: day.lunchCount,
    dinnerCount: day.dinnerCount,
    mealPriceOverride: day.mealPriceOverride ?? null,
    accommodation: day.accommodation || {},
    flights: day.flights || [],
    places: (day.places?.create || []).map((p) => ({
      id: null, placeId: p.placeId, place: null, customName: p.customName, orderIndex: p.orderIndex,
    })),
    activities: (day.activities?.create || []).map((a) => ({
      id: null, activityId: a.activityId, activity: null, name: a.name,
      defaultCost: a.defaultCost, costOverride: a.costOverride, orderIndex: a.orderIndex,
    })),
    transports: (day.transports?.create || []).map((t) => ({
      id: null, routeType: t.routeType, transportMode: t.transportMode, pricingModel: t.pricingModel,
      unitCost: t.unitCost, distanceKm: t.distanceKm, origin: t.origin, destination: t.destination,
    })),
  }));
}

/**
 * Read-only: computes the itinerary/cost-lines/pricing shape a pristine
 * selection would have, without persisting anything. For a real package this
 * fetches the live blueprint from package-service; for the manual slot it's
 * a single blank day with no cost lines.
 */
export async function deriveSelectionView({ selection, fetchImpl = fetch }) {
  if (selection.isManual) {
    return {
      packageName: null,
      days: [createDefaultManualDay()],
      costLines: [],
      pricing: { currency: 'USD', marginType: null, marginValue: null },
    };
  }
  const pkg = await fetchPackage(selection.packageId, fetchImpl);
  const { packageName, days, costLines, pricing } = buildDraftData(pkg);
  return { packageName, days, costLines, pricing };
}

/**
 * Persists what `deriveSelectionView` would compute into the selection's
 * child rows — used when a still-pristine selection is quoted, so the
 * quotation and the lead's own copy freeze the same state. No-op if the
 * selection is already materialized.
 */
export async function materializeSelection({ selectionId, fetchImpl = fetch, prismaClient = prisma }) {
  const selection = await prismaClient.leadPackageSelection.findUnique({ where: { id: selectionId } });
  if (!selection) throw new AppError('Package selection not found', 404);

  if (await isSelectionMaterialized(selectionId, prismaClient)) {
    return selection;
  }

  const { packageName, days, costLines, pricing } = await deriveSelectionView({ selection, fetchImpl });

  return prismaClient.leadPackageSelection.update({
    where: { id: selectionId },
    data: {
      ...(packageName != null ? { packageName } : {}),
      sourcePackageId: selection.isManual ? null : selection.packageId,
      itineraryDays: { create: days },
      costLines: { create: costLines },
      pricing: { create: pricing },
    },
  });
}

/**
 * "Refresh from original package" — discards a selection's persisted
 * itinerary/cost-line/pricing overrides, reverting it to pristine (it will
 * be re-derived from the live package on next read). Optional transfer
 * flights are left untouched — they're rep-entered preferences independent
 * of the package blueprint, nothing to "revert" them to.
 *
 * Refuses on the manual slot (nothing to refresh from). Refuses on a
 * selection with an active quotation unless `force` is passed — refreshing
 * would desync the lead's saved itinerary from what was actually quoted.
 */
export async function refreshSelection({ selectionId, force = false, prismaClient = prisma }) {
  const selection = await prismaClient.leadPackageSelection.findUnique({ where: { id: selectionId } });
  if (!selection) throw new AppError('Package selection not found', 404);
  if (selection.isManual) {
    throw new AppError('Manual itinerary has no original package to refresh from', 400);
  }
  if (selection.currentQuoteId && !force) {
    throw new AppError(
      'This package has already been quoted — refreshing will make the saved itinerary no longer match what was quoted',
      409,
      'REFRESH_BLOCKED_QUOTED',
    );
  }

  await prismaClient.$transaction([
    prismaClient.leadItineraryDay.deleteMany({ where: { leadPackageSelectionId: selectionId } }),
    prismaClient.leadCostLine.deleteMany({ where: { leadPackageSelectionId: selectionId } }),
    prismaClient.leadPricing.deleteMany({ where: { leadPackageSelectionId: selectionId } }),
  ]);

  return prismaClient.leadPackageSelection.update({
    where: { id: selectionId },
    data: { sourcePackageId: null },
  });
}

/**
 * Recompute and persist all pricing totals for a selection from its current
 * cost lines. Mirrors the lead-wide version this replaced, scoped down.
 */
export async function recomputeSelectionPricing(selectionId, verifiedPaymentTotal = null, prismaClient = prisma) {
  const selection = await prismaClient.leadPackageSelection.findUnique({
    where: { id: selectionId },
    include: { pricing: true, costLines: true, lead: true },
  });
  if (!selection) throw new AppError('Package selection not found', 404);
  const pricing = selection.pricing || {};
  const computed = computePricing({
    lines: selection.costLines.map(toLineDescriptor),
    travelers: selection.lead.numberOfTravelers || 1,
    currency: pricing.currency || 'USD',
    marginType: pricing.marginType || null,
    marginValue: Number(pricing.marginValue) || 0,
    depositType: pricing.depositType || null,
    depositValue: Number(pricing.depositValue) || 0,
    discountType: pricing.discountType || 'none',
    discountValue: Number(pricing.discountValue) || 0,
    serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
    verifiedPaymentTotal: (verifiedPaymentTotal ?? Number(pricing.paidAmount)) || 0,
  });
  return prismaClient.leadPricing.update({
    where: { leadPackageSelectionId: selectionId },
    data: {
      estimatedTotal: computed.estimatedTotal,
      actualTotal: computed.actualTotal,
      sellSubtotal: computed.sellSubtotal,
      discountAmount: computed.discountAmount,
      taxableSubtotal: computed.taxableSubtotal,
      taxAmount: computed.taxAmount,
      serviceChargeAmount: computed.serviceChargeAmount,
      totalAmount: computed.totalAmount,
      depositAmount: computed.depositAmount,
      paidAmount: computed.paidAmount,
      balanceDue: computed.balanceDue,
      profit: computed.profit,
    },
  });
}

/**
 * Snapshot a selection's pricing into a versioned billing quotation. A still
 * -pristine selection is materialized first so the quotation and the lead's
 * own copy freeze the same state.
 */
export async function snapshotSelectionQuotation(selectionId, { createdById = null, fetchImpl = fetch, prismaClient = prisma } = {}) {
  if (!(await isSelectionMaterialized(selectionId, prismaClient))) {
    await materializeSelection({ selectionId, fetchImpl, prismaClient });
  }

  const selection = await prismaClient.leadPackageSelection.findUnique({
    where: { id: selectionId },
    include: { pricing: true, costLines: true, lead: true },
  });
  if (!selection) throw new AppError('Package selection not found', 404);
  const { pricing, lead } = selection;
  if (!pricing) throw new AppError('Selection has no pricing yet', 400);

  const computed = computePricing({
    lines: selection.costLines.map(toLineDescriptor),
    travelers: lead.numberOfTravelers || 1,
    currency: pricing.currency || 'USD',
    marginType: pricing.marginType || null,
    marginValue: Number(pricing.marginValue) || 0,
    depositType: pricing.depositType || null,
    depositValue: Number(pricing.depositValue) || 0,
    discountType: pricing.discountType || 'none',
    discountValue: Number(pricing.discountValue) || 0,
    serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
    verifiedPaymentTotal: Number(pricing.paidAmount) || 0,
  });

  const items = computed.lines.map((l) => ({
    description: l.description,
    category: l.category,
    quantity: l.quantity,
    unitPrice: l.quotedUnitPrice,
    notes: null,
  }));

  // Enrich the quotation with the package's inclusions/exclusions so the PDF and
  // email carry real content. A package-fetch failure must not block quoting.
  let includedServices = [];
  let excludedServices = [];
  if (selection.packageId) {
    try {
      const pkg = await fetchPackage(selection.packageId, fetchImpl);
      if (Array.isArray(pkg?.inclusions)) includedServices = pkg.inclusions.filter(Boolean);
      if (Array.isArray(pkg?.exclusions)) excludedServices = pkg.exclusions.filter(Boolean);
    } catch {
      // Leave inclusions/exclusions empty rather than failing the snapshot.
    }
  }

  const res = await fetchImpl(`${BILLING_SERVICE_URL}/api/v1/billing/quotations/from-lead`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': process.env.INTERNAL_EVENTS_TOKEN || '',
    },
    body: JSON.stringify({
      leadId: lead.id,
      packageId: selection.packageId,
      // The acting user, threaded from the /quote request. billing has no
      // request user on this internal (gateway-bypassing) call.
      createdById,
      currency: pricing.currency || 'USD',
      customer: { name: lead.name, email: lead.email, phone: lead.phone, address: lead.city },
      items,
      discountType: pricing.discountType || 'none',
      discountValue: Number(pricing.discountValue) || 0,
      serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
      notes: null,
      terms: null,
      paymentTerms: null,
      includedServices,
      excludedServices,
    }),
  });
  if (!res.ok) {
    throw new AppError('Failed to snapshot quotation in billing-service', 502);
  }
  const json = await res.json();
  return json.data;
}
