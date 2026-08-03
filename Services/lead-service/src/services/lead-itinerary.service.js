import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import { buildItineraryCostLines } from '../../../shared/lead-pricing-engine/src/index.js';
import { computePricing, toLineDescriptor } from './pricing.service.js';
import { fetchPackage } from './lead-draft.service.js';

export const EDIT_BLOCKED_STATUSES = [
  'QUOTED',
  'APPROVED',
  'BOOKING_IN_PROGRESS',
  'CONFIRMED',
  'BOOKING_FAILED',
  'CLOSED_LOST',
  'CANCELLED',
];

/**
 * Map editor-shaped days (same shape package-service serializes) into nested
 * Prisma create payloads for the lead-owned itinerary tables.
 */
export function buildDaysCreateData(days) {
  return (days || []).map((day, idx) => ({
    dayNumber: day.dayNumber ?? idx + 1,
    title: day.title ?? null,
    description: day.description ?? null,
    breakfastCount: day.breakfastCount || 0,
    lunchCount: day.lunchCount || 0,
    dinnerCount: day.dinnerCount || 0,
    mealPriceOverride: day.mealPriceOverride != null ? Number(day.mealPriceOverride) : null,
    accommodation: day.accommodation ?? {},
    flights: day.flights ?? [],
    places: {
      create: (day.locations?.length ? day.locations : (day.places || [])).map((p, i) => ({
        placeId: typeof p === 'object' ? (p.placeId ?? null) : null,
        customName: typeof p === 'string' ? p : (p.customName || p.place?.name || null),
        orderIndex: typeof p === 'object' ? (p.orderIndex ?? i) : i,
      })),
    },
    activities: {
      create: (day.activities || []).map((a, i) => {
        if (typeof a === 'string') {
          const costs = (day.activityCosts || {})[a] || {};
          const rel = (day._relational?.activities || []).find((r) => (r.name || r.activity?.name) === a);
          return {
            activityId: rel?.activityId ?? null,
            name: a,
            defaultCost: costs.defaultCost ?? rel?.activity?.defaultCost ?? null,
            costOverride: costs.costOverride ?? rel?.costOverride ?? null,
            orderIndex: i,
          };
        }
        return {
          activityId: a.activityId ?? null,
          name: a.name ?? a.activity?.name ?? null,
          defaultCost: a.defaultCost != null
            ? Number(a.defaultCost)
            : (a.activity?.defaultCost != null ? Number(a.activity.defaultCost) : null),
          costOverride: a.costOverride != null ? Number(a.costOverride) : null,
          orderIndex: i,
        };
      }),
    },
    transports: {
      create: (day.transports || []).map((t, i) => ({
        routeType: t.routeType ?? null,
        transportMode: t.transportMode ?? null,
        pricingModel: t.pricingModel ?? null,
        unitCost: Number(t.unitCost) || 0,
        distanceKm: t.distanceKm != null ? Number(t.distanceKm) : null,
        origin: t.originPlaceId ?? t.origin ?? null,
        destination: t.destinationPlaceId ?? t.destination ?? null,
      })),
    },
  }));
}

/**
 * Derive AUTO cost lines from editor-shaped days (persistence column names).
 */
export function buildAutoCostLines(days) {
  const engineLines = buildItineraryCostLines({
    days: (days || []).map((d) => ({
      breakfastCount: d.breakfastCount || 0,
      lunchCount: d.lunchCount || 0,
      dinnerCount: d.dinnerCount || 0,
      accommodation: d.accommodation || {},
    })),
    activities: (days || []).flatMap((d) =>
      (d.activities || []).map((a) => {
        const name = typeof a === 'string' ? a : (a.name || a.activity?.name || '');
        const costs = (d.activityCosts || {})[name] || {};
        const rel = (d._relational?.activities || []).find((r) => (r.name || r.activity?.name) === name);
        return {
          defaultCost:
            costs.defaultCost ??
            (typeof a === 'object' ? a.defaultCost ?? a.activity?.defaultCost : undefined) ??
            rel?.activity?.defaultCost ??
            0,
          costOverride:
            costs.costOverride != null && costs.costOverride !== ''
              ? Number(costs.costOverride)
              : (typeof a === 'object' && a.costOverride != null
                ? Number(a.costOverride)
                : rel?.costOverride ?? null),
        };
      }),
    ),
    transports: (days || []).flatMap((d) =>
      (d.transports || []).map((t) => ({
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm,
      })),
    ),
  });
  return engineLines.map((line, i) => ({
    category: line.category,
    description: line.description,
    basis: line.basis,
    quantity: line.quantity ?? 1,
    estimatedUnitPrice: line.estimatedUnit ?? 0,
    actualUnitPrice: line.actualUnit ?? null,
    marginType: line.marginType ?? null,
    marginValue: line.marginValue ?? null,
    source: 'AUTO',
    orderIndex: i,
  }));
}

/**
 * Serialize persisted lead itinerary rows into the editor day shape.
 */
export function serializeLeadDays(lead) {
  return (lead.itineraryDays || []).map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    breakfastCount: day.breakfastCount,
    lunchCount: day.lunchCount,
    dinnerCount: day.dinnerCount,
    mealPriceOverride: day.mealPriceOverride ? Number(day.mealPriceOverride) : null,
    accommodation: day.accommodation || {},
    flights: day.flights || [],
    places: (day.places || []).map((p) => ({
      id: p.id,
      placeId: p.placeId,
      place: null,
      customName: p.customName,
      orderIndex: p.orderIndex,
    })),
    activities: (day.activities || []).map((a) => ({
      id: a.id,
      activityId: a.activityId,
      activity: null,
      name: a.name,
      defaultCost: a.defaultCost != null ? Number(a.defaultCost) : null,
      costOverride: a.costOverride != null ? Number(a.costOverride) : null,
      orderIndex: a.orderIndex,
    })),
    transports: (day.transports || []).map((t) => ({
      id: t.id,
      routeType: t.routeType,
      transportMode: t.transportMode,
      pricingModel: t.pricingModel,
      unitCost: Number(t.unitCost),
      distanceKm: t.distanceKm != null ? Number(t.distanceKm) : null,
      origin: t.origin,
      destination: t.destination,
    })),
  }));
}

/**
 * Atomic lead itinerary edit: replace days, regenerate AUTO cost lines (keep
 * MANUAL overrides), recompute pricing and move NEW/REVISION leads to
 * DRAFTING. Locked once the lead is quoted or later.
 */
export async function applyLeadItinerary({
  leadId,
  days = [],
  pricingSettings = {},
  actorId = null,
  fetchImpl = fetch,
  prismaClient = prisma,
}) {
  const lead = await prismaClient.lead.findUnique({
    where: { id: leadId },
    include: { pricing: true, costLines: true, itineraryDays: true },
  });
  if (!lead) throw new AppError('Lead not found', 404);

  if (EDIT_BLOCKED_STATUSES.includes(lead.lifecycleStatus)) {
    throw new AppError('Itinerary edits are locked after QUOTED; move back to DRAFTING first', 400);
  }

  // Ensure a pricing row exists; NEW leads inherit currency/margin from the package.
  let pricing = lead.pricing;
  if (!pricing) {
    let defaults = { currency: 'USD', marginType: null, marginValue: null };
    if (lead.packageId) {
      try {
        const pkg = await fetchPackage(lead.packageId, fetchImpl);
        defaults = {
          currency: pkg.currency || 'USD',
          marginType: pkg.defaultMarginType || null,
          marginValue: pkg.defaultMarginInput != null ? Number(pkg.defaultMarginInput) : null,
        };
      } catch {
        // fall back to USD defaults when the blueprint is unreachable
      }
    }
    pricing = await prismaClient.leadPricing.create({
      data: { leadId: lead.id, ...defaults },
    });
  }

  const nextStatus =
    lead.lifecycleStatus === 'NEW' || lead.lifecycleStatus === 'REVISION'
      ? 'DRAFTING'
      : lead.lifecycleStatus;

  const daysCreate = buildDaysCreateData(days);
  const autoLines = buildAutoCostLines(days);

  await prismaClient.$transaction([
    prismaClient.leadItineraryDay.deleteMany({ where: { leadId: lead.id } }),
    prismaClient.leadCostLine.deleteMany({ where: { leadId: lead.id, source: 'AUTO' } }),
  ]);

  await prismaClient.lead.update({
    where: { id: lead.id },
    data: {
      ...(daysCreate.length ? { itineraryDays: { create: daysCreate } } : {}),
      costLines: { create: autoLines },
      ...(nextStatus !== lead.lifecycleStatus
        ? {
            lifecycleStatus: nextStatus,
            statusHistory: {
              create: [{
                status: nextStatus,
                actor: 'USER',
                changedById: actorId,
                notes: 'Itinerary edited — moved to drafting',
              }],
            },
          }
        : {}),
    },
  });

  // Persist pricing settings + recomputed totals.
  const settings = { ...pricing, ...pricingSettings };
  const fresh = await prismaClient.lead.findUnique({
    where: { id: leadId },
    include: { costLines: true },
  });
  const computed = computePricing({
    lines: (fresh.costLines || []).map(toLineDescriptor),
    travelers: fresh.numberOfTravelers || 1,
    currency: settings.currency || 'USD',
    marginType: settings.marginType || null,
    marginValue: Number(settings.marginValue) || 0,
    depositType: settings.depositType || null,
    depositValue: Number(settings.depositValue) || 0,
    discountType: settings.discountType || 'none',
    discountValue: Number(settings.discountValue) || 0,
    serviceChargeRate: Number(settings.serviceChargeRate) || 0,
    verifiedPaymentTotal: Number(settings.paidAmount) || 0,
  });
  await prismaClient.leadPricing.update({
    where: { leadId },
    data: {
      currency: settings.currency || 'USD',
      marginType: settings.marginType ?? pricing.marginType ?? null,
      marginValue: settings.marginValue ?? pricing.marginValue ?? null,
      depositType: settings.depositType ?? pricing.depositType ?? null,
      depositValue: settings.depositValue ?? pricing.depositValue ?? 0,
      discountType: settings.discountType || 'none',
      discountValue: Number(settings.discountValue) || 0,
      serviceChargeRate: Number(settings.serviceChargeRate) || 0,
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

  return { leadId, lifecycleStatus: nextStatus };
}
