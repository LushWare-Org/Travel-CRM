/**
 * Seed sample leads for the relational pricing model.
 *
 * Prerequisite: `npm run db:push` (or db:migrate) + `npm run db:generate`
 * against the new schema, then run:
 *   node scripts/seed-leads.mjs
 *
 * Idempotent — leads are keyed by email; existing ones are skipped.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PackagePrismaClient } from '../../package-service/node_modules/@prisma/client/index.js';
import { buildDraftData } from '../src/services/lead-draft.service.js';
import { computePricing } from '../src/services/pricing.service.js';

const prisma = new PrismaClient();
const packagePrisma = new PackagePrismaClient();

// A minimal package blueprint (package-service shape) used to seed drafts.
const BLUEPRINT = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Sri Lanka Explorer',
  currency: 'USD',
  defaultMarginType: 'PERCENTAGE',
  defaultMarginInput: 15,
  itineraryDays: [
    {
      dayNumber: 1,
      title: 'Kandy',
      breakfastCount: 1,
      lunchCount: 1,
      dinnerCount: 1,
      accommodation: { totalAmount: 90, name: 'Kandy Hotel' },
      places: [{ placeId: null, customName: 'Temple of the Tooth' }],
      activities: [{ activityId: null, name: 'Temple Tour', defaultCost: 40 }],
      transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'VAN', pricingModel: 'PER_VEHICLE', unitCost: 120 }],
    },
    {
      dayNumber: 2,
      title: 'Nuwara Eliya',
      breakfastCount: 1,
      lunchCount: 1,
      dinnerCount: 1,
      accommodation: { totalAmount: 110, name: 'Hill Club' },
      places: [{ placeId: null, customName: 'Tea Plantation' }],
      activities: [{ activityId: null, name: 'Tea Tasting', defaultCost: 25 }],
      transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'VAN', pricingModel: 'PER_VEHICLE', unitCost: 150 }],
    },
  ],
};

/**
 * Resolve a real package blueprint from the database (prefer 'Sri Lanka
 * Explorer', else any package). Creates a minimal package when the table is
 * empty so the seeded leads always reference a real package.
 */
async function ensureBlueprint() {
  const existing = await packagePrisma.package.findFirst({
    include: {
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: { places: true, activities: true, transports: true },
      },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      title: existing.title,
      currency: existing.currency,
      defaultMarginType: existing.defaultMarginType,
      defaultMarginInput: Number(existing.defaultMarginInput),
      itineraryDays: (existing.itineraryDays || []).map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        breakfastCount: day.breakfastCount,
        lunchCount: day.lunchCount,
        dinnerCount: day.dinnerCount,
        mealPriceOverride: day.mealPriceOverride != null ? Number(day.mealPriceOverride) : null,
        accommodation: day.accommodation || {},
        flights: day.flights || [],
        places: (day.places || []).map((p) => ({ placeId: p.placeId, customName: p.customName, orderIndex: p.orderIndex })),
        activities: (day.activities || []).map((a) => ({
          activityId: a.activityId,
          name: a.name,
          defaultCost: a.defaultCost != null ? Number(a.defaultCost) : null,
          costOverride: a.costOverride != null ? Number(a.costOverride) : null,
        })),
        transports: (day.transports || []).map((t) => ({
          routeType: t.routeType,
          transportMode: t.transportMode,
          pricingModel: t.pricingModel,
          unitCost: Number(t.unitCost),
          distanceKm: t.distanceKm != null ? Number(t.distanceKm) : null,
        })),
      })),
    };
  }

  const created = await packagePrisma.package.create({
    data: {
      title: BLUEPRINT.title,
      currency: BLUEPRINT.currency,
      defaultMarginType: BLUEPRINT.defaultMarginType,
      defaultMarginInput: BLUEPRINT.defaultMarginInput,
      itineraryDays: {
        create: BLUEPRINT.itineraryDays.map((day, idx) => ({
          dayNumber: day.dayNumber ?? idx + 1,
          title: day.title,
          breakfastCount: day.breakfastCount,
          lunchCount: day.lunchCount,
          dinnerCount: day.dinnerCount,
          accommodation: day.accommodation,
          places: { create: (day.places || []).map((p, i) => ({ placeId: p.placeId, customName: p.customName, orderIndex: p.orderIndex ?? i })) },
          activities: { create: (day.activities || []).map((a, i) => ({ activityId: a.activityId, name: a.name, defaultCost: a.defaultCost, costOverride: a.costOverride, orderIndex: a.orderIndex ?? i })) },
          transports: { create: (day.transports || []).map((t) => ({ routeType: t.routeType, transportMode: t.transportMode, pricingModel: t.pricingModel, unitCost: t.unitCost, distanceKm: t.distanceKm })) },
        })),
      },
    },
  });
  return { ...BLUEPRINT, id: created.id };
}

const SEED_LEADS = [
  {
    email: 'seed.new@example.com',
    name: 'Nimal Perera',
    phone: '+94771234567',
    destination: 'Kandy',
    numberOfTravelers: 2,
    packageId: BLUEPRINT.id,
    lifecycleStatus: 'NEW',
    tags: ['seed'],
  },
  {
    email: 'seed.drafting@example.com',
    name: 'Kumari Silva',
    phone: '+94772345678',
    destination: 'Nuwara Eliya',
    numberOfTravelers: 4,
    packageId: BLUEPRINT.id,
    lifecycleStatus: 'DRAFTING',
    withCopy: true,
    optionalFlights: [
      {
        flightType: 'TO_START',
        origin: 'Colombo',
        destination: 'Kandy',
        estimatedUnitPrice: 85,
      },
    ],
    tags: ['seed'],
  },
  {
    email: 'seed.approved@example.com',
    name: 'Roshan Fernando',
    phone: '+94773456789',
    destination: 'Sri Lanka Explorer',
    numberOfTravelers: 2,
    packageId: BLUEPRINT.id,
    lifecycleStatus: 'APPROVED',
    withCopy: true,
    paid: true,
    tags: ['seed'],
  },
];

async function createPricing(leadId, travelers, settings) {
  const lines = await prisma.leadCostLine.findMany({ where: { leadId } });
  const computed = computePricing({
    lines: lines.map((l) => ({
      category: l.category,
      description: l.description,
      basis: l.basis,
      quantity: l.quantity,
      estimatedUnit: Number(l.estimatedUnitPrice),
      actualUnit: l.actualUnitPrice != null ? Number(l.actualUnitPrice) : null,
      marginType: l.marginType || null,
      marginValue: l.marginValue != null ? Number(l.marginValue) : null,
      source: l.source,
    })),
    travelers,
    currency: settings.currency,
    marginType: settings.marginType,
    marginValue: settings.marginValue,
    depositType: settings.depositType,
    depositValue: settings.depositValue,
    verifiedPaymentTotal: settings.paid ? Number(settings.depositValue) : 0,
  });
  return prisma.leadPricing.update({
    where: { leadId },
    data: {
      currency: computed.currency,
      marginType: settings.marginType,
      marginValue: settings.marginValue,
      depositType: settings.depositType,
      depositValue: settings.depositValue,
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

async function seedLead(leadSeed, blueprint) {
  const existing = await prisma.lead.findFirst({ where: { email: leadSeed.email } });
  if (existing) {
    console.log(`SKIP ${leadSeed.email} (already exists)`);
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      name: leadSeed.name,
      email: leadSeed.email,
      phone: leadSeed.phone,
      destination: leadSeed.destination,
      numberOfTravelers: leadSeed.numberOfTravelers,
      packageId: leadSeed.packageId,
      packageName: blueprint.title,
      lifecycleStatus: leadSeed.lifecycleStatus,
      tags: leadSeed.tags || [],
      statusHistory: {
        create: [{ status: leadSeed.lifecycleStatus, actor: 'SYSTEM', notes: 'Seeded' }],
      },
    },
  });

  if (leadSeed.withCopy) {
    const { days, costLines, pricing } = buildDraftData(blueprint);
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        itineraryDays: { create: days },
        costLines: { create: costLines },
        pricing: { create: pricing },
      },
    });

    for (const flight of leadSeed.optionalFlights || []) {
      const created = await prisma.leadOptionalFlight.create({
        data: {
          leadId: lead.id,
          flightType: flight.flightType,
          origin: flight.origin,
          destination: flight.destination,
          estimatedUnitPrice: flight.estimatedUnitPrice,
          quantity: leadSeed.numberOfTravelers,
        },
      });
      await prisma.leadCostLine.create({
        data: {
          leadId: lead.id,
          category: 'transportation',
          description: `Flight: ${flight.origin} → ${flight.destination}`,
          basis: 'PER_PERSON',
          quantity: leadSeed.numberOfTravelers,
          estimatedUnitPrice: flight.estimatedUnitPrice,
          source: 'MANUAL',
          optionalFlightId: created.id,
        },
      });
    }

    await createPricing(lead.id, leadSeed.numberOfTravelers, {
      currency: blueprint.currency,
      marginType: blueprint.defaultMarginType,
      marginValue: blueprint.defaultMarginInput,
      depositType: 'PERCENTAGE',
      depositValue: 30,
      paid: leadSeed.paid,
    });
  }

  console.log(`SEEDED ${leadSeed.email} (${leadSeed.lifecycleStatus})`);
}

async function main() {
  const blueprint = await ensureBlueprint();
  console.log(`Using package blueprint: ${blueprint.title} (${blueprint.id})`);
  for (const seed of SEED_LEADS) {
    await seedLead({ ...seed, packageId: blueprint.id }, blueprint);
  }
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await packagePrisma.$disconnect();
  });
