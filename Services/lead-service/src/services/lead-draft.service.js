import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import { buildItineraryCostLines } from '../../../shared/lead-pricing-engine/src/index.js';

const PACKAGE_SERVICE_URL = process.env.PACKAGE_SERVICE_URL || 'http://localhost:3003';

/**
 * Fetch a package blueprint from package-service.
 * @param {string} packageId
 * @param {Function} [fetchImpl] - injectable for tests
 */
export async function fetchPackage(packageId, fetchImpl = fetch) {
  const res = await fetchImpl(`${PACKAGE_SERVICE_URL}/api/v1/packages/${packageId}`);
  if (!res.ok) {
    throw new AppError(`Package not found: ${packageId}`, 404);
  }
  const json = await res.json();
  return json?.data ?? json;
}

/**
 * Pure mapping from a package blueprint to the lead-owned draft copy:
 * itinerary days (with snapshotted places/activities/transports), AUTO cost
 * lines and LeadPricing defaults (currency + margin inherited).
 */
export function buildDraftData(packageData) {
  const days = (packageData.itineraryDays || []).map((day, idx) => ({
    dayNumber: day.dayNumber ?? idx + 1,
    title: day.title ?? null,
    description: day.description ?? null,
    breakfastCount: day.breakfastCount || 0,
    lunchCount: day.lunchCount || 0,
    dinnerCount: day.dinnerCount || 0,
    mealPriceOverride: day.mealPriceOverride ?? null,
    accommodation: day.accommodation ?? {},
    flights: day.flights ?? [],
    places: {
      create: (day.places || []).map((p, i) => ({
        placeId: p.placeId ?? null,
        customName: p.customName ?? null,
        orderIndex: p.orderIndex ?? i,
      })),
    },
    activities: {
      create: (day.activities || []).map((a, i) => ({
        activityId: a.activityId ?? null,
        name: a.name ?? null,
        defaultCost: a.defaultCost != null ? Number(a.defaultCost) : null,
        costOverride: a.costOverride != null ? Number(a.costOverride) : null,
        orderIndex: a.orderIndex ?? i,
      })),
    },
    transports: {
      create: (day.transports || []).map((t, i) => ({
        routeType: t.routeType ?? null,
        transportMode: t.transportMode ?? null,
        pricingModel: t.pricingModel ?? null,
        unitCost: Number(t.unitCost) || 0,
        distanceKm: t.distanceKm != null ? Number(t.distanceKm) : null,
        origin: t.origin ?? null,
        destination: t.destination ?? null,
      })),
    },
  }));

  const engineLines = buildItineraryCostLines({
    days: days.map((d) => ({
      breakfastCount: d.breakfastCount,
      lunchCount: d.lunchCount,
      dinnerCount: d.dinnerCount,
      accommodation: d.accommodation,
    })),
    activities: days.flatMap((d) => d.activities.create),
    transports: days.flatMap((d) => d.transports.create),
  });

  // Persistence shape (Prisma column names), not the engine descriptor shape.
  const costLines = engineLines.map((line, i) => ({
    category: line.category,
    description: line.description,
    basis: line.basis,
    quantity: line.quantity ?? 1,
    estimatedUnitPrice: line.estimatedUnit ?? 0,
    actualUnitPrice: line.actualUnit ?? null,
    marginType: line.marginType ?? null,
    marginValue: line.marginValue ?? null,
    source: line.source ?? 'AUTO',
    orderIndex: i,
  }));

  return {
    packageId: packageData.id,
    packageName: packageData.title,
    days,
    costLines,
    pricing: {
      currency: packageData.currency || 'USD',
      marginType: packageData.defaultMarginType || null,
      marginValue: packageData.defaultMarginInput != null ? Number(packageData.defaultMarginInput) : null,
    },
  };
}

/**
 * Detects whether a lead's itinerary still matches a package's blueprint
 * verbatim (no manual edits since it was copied in). Only a pristine
 * itinerary is safe to silently replace when the lead switches packages.
 */
export function isItineraryPristine(lead) {
  return Boolean(lead?.sourcePackageId) && lead.sourcePackageId === lead.packageId;
}

/**
 * Replaces a lead's itinerary + AUTO cost lines with a new package's
 * blueprint. Only call this when isItineraryPristine(lead) is true for the
 * *old* package — a customized itinerary must never be silently overwritten.
 * Preserves the lead's existing pricing settings (margin, deposit, etc.);
 * callers are responsible for resetting discount before/after, per their
 * own UX rules.
 *
 * @param {Object} params
 * @param {string} params.leadId
 * @param {string} params.packageId - the new package to copy in
 * @param {Function} [params.fetchImpl] - injectable fetch for tests
 * @param {Object} [params.prismaClient] - injectable Prisma client for tests
 */
export async function replaceLeadItineraryFromPackage({ leadId, packageId, fetchImpl = fetch, prismaClient = prisma }) {
  const pkg = await fetchPackage(packageId, fetchImpl);
  const { packageName, days, costLines } = buildDraftData(pkg);

  await prismaClient.$transaction([
    prismaClient.leadItineraryDay.deleteMany({ where: { leadId } }),
    prismaClient.leadCostLine.deleteMany({ where: { leadId, source: 'AUTO' } }),
  ]);

  return prismaClient.lead.update({
    where: { id: leadId },
    data: {
      packageName,
      sourcePackageId: packageId,
      itineraryDays: { create: days },
      costLines: { create: costLines },
    },
  });
}

/**
 * One-time detached copy of the package blueprint into the lead's own tables.
 * Refuses to run again once the lead has a draft.
 *
 * @param {Object} params
 * @param {string} params.leadId
 * @param {string} params.packageId
 * @param {Function} [params.fetchImpl] - injectable fetch for tests
 */
export async function copyPackageToLead({ leadId, packageId, fetchImpl = fetch }) {
  const existing = await prisma.leadItineraryDay.count({ where: { leadId } });
  if (existing > 0) {
    throw new AppError('Lead already has a draft copy; re-copy is not allowed', 400);
  }

  const pkg = await fetchPackage(packageId, fetchImpl);
  const { packageName, days, costLines, pricing } = buildDraftData(pkg);

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      packageName,
      sourcePackageId: packageId,
      itineraryDays: { create: days },
      costLines: { create: costLines },
      pricing: { create: pricing },
    },
  });
}
