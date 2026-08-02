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

  const costLines = buildItineraryCostLines({
    days: days.map((d) => ({
      breakfastCount: d.breakfastCount,
      lunchCount: d.lunchCount,
      dinnerCount: d.dinnerCount,
      accommodation: d.accommodation,
    })),
    activities: days.flatMap((d) => d.activities.create),
    transports: days.flatMap((d) => d.transports.create),
  }).map((line, i) => ({ ...line, orderIndex: i }));

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
      itineraryDays: { create: days },
      costLines: { create: costLines },
      pricing: { create: pricing },
    },
  });
}
