/**
 * Seed sample leads for the multi-package-per-lead model.
 *
 * Prerequisite: `npm run db:migrate:deploy` + `npm run db:generate` against
 * the current schema, and package-service already seeded with real packages
 * (run package-service's own seed first if `Package.findMany()` comes back
 * empty).
 *
 * Idempotent — leads are keyed by email; existing ones are skipped.
 *
 * Deliberately covers the range of states the new model can be in:
 *   - a pristine selection (package attached, nothing materialized yet)
 *   - a materialized/edited selection
 *   - a manual (no-package) selection
 *   - multiple selections on the same lead, mixed pristine/edited/manual
 *   - a selection that's already been quoted, alongside one that hasn't
 *   - a selection with an explicit destinationOverride, on a lead whose own
 *     destination is still a placeholder ("Multiple options") — exercises
 *     the full destinationOverride > package.destination > lead.destination
 *     precedence in one scenario (see seedThreePackages)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PackagePrismaClient } from '../../package-service/node_modules/@prisma/client/index.js';
import { buildDraftData } from '../src/services/lead-draft.service.js';
import { buildDaysCreateData, buildAutoCostLines } from '../src/services/lead-itinerary.service.js';
import { computePricing, toLineDescriptor } from '../src/services/pricing.service.js';

const prisma = new PrismaClient();
const packagePrisma = new PackagePrismaClient();

const packageCache = new Map();

/** Loads a real package blueprint (package-service shape) by title. */
async function loadPackage(title) {
  if (packageCache.has(title)) return packageCache.get(title);

  const pkg = await packagePrisma.package.findFirst({
    where: { title },
    include: {
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: { places: true, activities: true, transports: true },
      },
    },
  });
  if (!pkg) {
    throw new Error(`Seed package not found: "${title}". Run package-service's own seed script first.`);
  }

  const blueprint = {
    id: pkg.id,
    title: pkg.title,
    currency: pkg.currency,
    defaultMarginType: pkg.defaultMarginType,
    defaultMarginInput: pkg.defaultMarginInput != null ? Number(pkg.defaultMarginInput) : null,
    itineraryDays: pkg.itineraryDays.map((day) => ({
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
  packageCache.set(title, blueprint);
  return blueprint;
}

// ─── Selection builders ──────────────────────────────────────────

/** Attaches a package with nothing materialized yet — derived live on read. */
async function createPristineSelection(leadId, blueprint) {
  return prisma.leadPackageSelection.create({
    data: { leadId, packageId: blueprint.id, packageName: blueprint.title, isManual: false },
  });
}

/**
 * Attaches a package and copies its blueprint in immediately (as if the rep
 * had edited it, or it had been quoted). `edited: true` clears
 * sourcePackageId (customized); `edited: false` leaves it pointing at the
 * blueprint (freshly materialized, not yet touched).
 */
async function createMaterializedSelection(leadId, blueprint, { edited = true, destinationOverride = null } = {}) {
  const { packageName, days, costLines, pricing } = buildDraftData(blueprint);
  return prisma.leadPackageSelection.create({
    data: {
      leadId,
      packageId: blueprint.id,
      packageName,
      isManual: false,
      sourcePackageId: edited ? null : blueprint.id,
      destinationOverride,
      itineraryDays: { create: days },
      costLines: { create: costLines },
      pricing: { create: pricing },
    },
  });
}

/** The manual (no-package) slot, hand-built from editor-shaped days. */
async function createManualSelection(leadId, editorDays) {
  const days = buildDaysCreateData(editorDays);
  const costLines = buildAutoCostLines(editorDays);
  return prisma.leadPackageSelection.create({
    data: {
      leadId,
      isManual: true,
      packageId: null,
      itineraryDays: { create: days },
      costLines: { create: costLines },
      pricing: { create: { currency: 'USD', marginType: null, marginValue: null } },
    },
  });
}

async function addOptionalFlight(selectionId, travelers, { flightType, origin, destination, estimatedUnitPrice }) {
  const flight = await prisma.leadOptionalFlight.create({
    data: { leadPackageSelectionId: selectionId, flightType, origin, destination, estimatedUnitPrice, quantity: travelers },
  });
  await prisma.leadCostLine.create({
    data: {
      leadPackageSelectionId: selectionId,
      category: 'transportation',
      description: `Flight: ${origin} → ${destination}`,
      basis: 'PER_PERSON',
      quantity: travelers,
      estimatedUnitPrice,
      source: 'MANUAL',
      optionalFlightId: flight.id,
    },
  });
}

/** Recomputes and persists a selection's pricing totals from its cost lines. */
async function recomputePricing(selectionId, travelers, settingsOverrides = {}) {
  const selection = await prisma.leadPackageSelection.findUnique({
    where: { id: selectionId },
    include: { pricing: true, costLines: true },
  });
  if (!selection.pricing) return null;
  const settings = { ...selection.pricing, ...settingsOverrides };
  const computed = computePricing({
    lines: selection.costLines.map(toLineDescriptor),
    travelers,
    currency: settings.currency || 'USD',
    marginType: settings.marginType || null,
    marginValue: Number(settings.marginValue) || 0,
    depositType: settings.depositType || 'PERCENTAGE',
    depositValue: Number(settings.depositValue) || 30,
    discountType: settings.discountType || 'none',
    discountValue: Number(settings.discountValue) || 0,
    serviceChargeRate: Number(settings.serviceChargeRate) || 0,
    verifiedPaymentTotal: Number(settings.verifiedPaymentTotal) || 0,
  });
  return prisma.leadPricing.update({
    where: { leadPackageSelectionId: selectionId },
    data: {
      currency: settings.currency || 'USD',
      marginType: settings.marginType || null,
      marginValue: settings.marginValue ?? null,
      depositType: settings.depositType || 'PERCENTAGE',
      depositValue: Number(settings.depositValue) || 30,
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
}

// ─── Lead-level helpers ───────────────────────────────────────────

async function createBaseLead({ email, name, phone, destination, numberOfTravelers, lifecycleStatus, tags = ['seed'] }) {
  return prisma.lead.create({
    data: {
      name, email, phone, destination, numberOfTravelers, lifecycleStatus,
      tags,
      statusHistory: { create: [{ status: lifecycleStatus, actor: 'SYSTEM', notes: 'Seeded' }] },
    },
  });
}

async function setPrimarySelection(leadId, selectionId) {
  await prisma.lead.update({ where: { id: leadId }, data: { primarySelectionId: selectionId } });
}

const manualDaysFixture = [
  {
    dayNumber: 1,
    title: 'Arrival in Colombo',
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 1,
    accommodation: { totalAmount: 60, name: 'City Hotel Colombo' },
    locations: ['Colombo Fort', 'Galle Face Green'],
    activities: ['City Walking Tour'],
    activityCosts: { 'City Walking Tour': { defaultCost: 20, costOverride: null } },
    transports: [{ routeType: 'AIRPORT_TRANSFER', transportMode: 'CAR', pricingModel: 'PER_VEHICLE', unitCost: 40 }],
  },
  {
    dayNumber: 2,
    title: 'Negombo Beach Day',
    breakfastCount: 1,
    lunchCount: 1,
    dinnerCount: 0,
    accommodation: { totalAmount: 75, name: 'Negombo Beach Resort' },
    locations: ['Negombo Beach'],
    activities: ['Snorkeling'],
    activityCosts: { Snorkeling: { defaultCost: 35, costOverride: null } },
    transports: [],
  },
];

// ─── Seed scenarios ────────────────────────────────────────────────

async function seedNewLeadWithPristinePackage() {
  const email = 'seed.new@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const pkg = await loadPackage('Sri Lanka Heritage Explorer');
  const lead = await createBaseLead({
    email, name: 'Nimal Perera', phone: '+94771234567', destination: 'Sri Lanka', numberOfTravelers: 2, lifecycleStatus: 'NEW',
  });
  const selection = await createPristineSelection(lead.id, pkg);
  await setPrimarySelection(lead.id, selection.id);
  console.log(`SEEDED ${email} — NEW, 1 pristine package selection`);
}

async function seedDraftingSingleEditedPackage() {
  const email = 'seed.drafting@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const pkg = await loadPackage('Maldives Luxury Escape');
  const lead = await createBaseLead({
    email, name: 'Kumari Silva', phone: '+94772345678', destination: 'Maldives', numberOfTravelers: 4, lifecycleStatus: 'DRAFTING',
  });
  const selection = await createMaterializedSelection(lead.id, pkg, { edited: true });
  await addOptionalFlight(selection.id, 4, { flightType: 'TO_START', origin: 'Colombo', destination: 'Male', estimatedUnitPrice: 85 });
  await recomputePricing(selection.id, 4, { marginType: pkg.defaultMarginType, marginValue: pkg.defaultMarginInput, depositType: 'PERCENTAGE', depositValue: 30 });
  await setPrimarySelection(lead.id, selection.id);
  console.log(`SEEDED ${email} — DRAFTING, 1 edited package selection + transfer flight`);
}

async function seedMultiPackageDrafting() {
  const email = 'seed.multi-package@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const dubai = await loadPackage('Dubai Luxury Experience');
  const europe = await loadPackage('European Grand Tour');
  const lead = await createBaseLead({
    email, name: 'Ashan Rodrigo', phone: '+94773344556', destination: 'Dubai / Europe', numberOfTravelers: 2, lifecycleStatus: 'DRAFTING',
  });

  // Tab 1: edited/customized.
  const selA = await createMaterializedSelection(lead.id, dubai, { edited: true });
  await recomputePricing(selA.id, 2, { marginType: dubai.defaultMarginType, marginValue: dubai.defaultMarginInput, depositType: 'PERCENTAGE', depositValue: 30 });

  // Tab 2: still pristine — the rep attached it to compare against Dubai, hasn't touched it yet.
  await createPristineSelection(lead.id, europe);

  await setPrimarySelection(lead.id, selA.id);
  console.log(`SEEDED ${email} — DRAFTING, 2 packages (1 edited + 1 pristine)`);
}

async function seedManualPlusPackage() {
  const email = 'seed.manual-plus-package@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const bali = await loadPackage('Bali Honeymoon Bliss');
  const lead = await createBaseLead({
    email, name: 'Priya Jayasuriya', phone: '+94774455667', destination: 'Sri Lanka / Bali', numberOfTravelers: 2, lifecycleStatus: 'DRAFTING',
  });

  const manual = await createManualSelection(lead.id, manualDaysFixture);
  await recomputePricing(manual.id, 2, { depositType: 'PERCENTAGE', depositValue: 30 });

  await createPristineSelection(lead.id, bali);

  await setPrimarySelection(lead.id, manual.id);
  console.log(`SEEDED ${email} — DRAFTING, manual itinerary + 1 pristine package`);
}

async function seedQuotedMultiPackage() {
  const email = 'seed.quoted-multi@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const sriLanka = await loadPackage('Sri Lanka Heritage Explorer');
  const thailand = await loadPackage('Thailand Family Adventure');
  const lead = await createBaseLead({
    email, name: 'Chamara Wickramasinghe', phone: '+94775566778', destination: 'Sri Lanka / Thailand', numberOfTravelers: 3, lifecycleStatus: 'QUOTED',
  });

  // Already quoted — currentQuoteId is a soft ref to billing.Quotation.id;
  // a fake id is fine for seed/demo purposes (no real quotation to point to).
  const quoted = await createMaterializedSelection(lead.id, sriLanka, { edited: true });
  await recomputePricing(quoted.id, 3, { marginType: sriLanka.defaultMarginType, marginValue: sriLanka.defaultMarginInput, depositType: 'PERCENTAGE', depositValue: 30 });
  await prisma.leadPackageSelection.update({ where: { id: quoted.id }, data: { currentQuoteId: '00000000-0000-4000-8000-0000seedquo1' } });

  // A second package still being drafted for comparison — the "many
  // packages may be sold under the same lead" scenario this feature targets.
  const beingDrafted = await createMaterializedSelection(lead.id, thailand, { edited: true });
  await recomputePricing(beingDrafted.id, 3, { marginType: thailand.defaultMarginType, marginValue: thailand.defaultMarginInput, depositType: 'PERCENTAGE', depositValue: 30 });

  await setPrimarySelection(lead.id, quoted.id);
  console.log(`SEEDED ${email} — QUOTED, 1 already-quoted package + 1 still being drafted`);
}

async function seedThreePackages() {
  const email = 'seed.three-packages@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const europe = await loadPackage('European Grand Tour');
  const japan = await loadPackage('Japan Cultural Journey');
  const maldives = await loadPackage('Maldives Luxury Escape');
  // Still comparing options at inquiry time — exactly the "Multiple options"
  // placeholder the destination precedence fix protects against. This
  // scenario also exercises the next tier up: the primary (edited) selection
  // below sets an explicit destinationOverride, which must win over both
  // this lead-level placeholder AND the Japan package's own destination.
  const lead = await createBaseLead({
    email, name: 'Dilani Gunasekara', phone: '+94776677889', destination: 'Multiple options', numberOfTravelers: 2, lifecycleStatus: 'DRAFTING',
  });

  await createPristineSelection(lead.id, europe);
  const edited = await createMaterializedSelection(lead.id, japan, {
    edited: true,
    // Rep-entered override, set with confirmation in Management since it
    // differs from the package's own destination ("Japan") — a customized
    // multi-city itinerary within the country.
    destinationOverride: 'Kyoto & Osaka, Japan (custom itinerary)',
  });
  await recomputePricing(edited.id, 2, { marginType: japan.defaultMarginType, marginValue: japan.defaultMarginInput, depositType: 'PERCENTAGE', depositValue: 30 });
  await createPristineSelection(lead.id, maldives);

  await setPrimarySelection(lead.id, edited.id);
  console.log(`SEEDED ${email} — DRAFTING, 3 packages (1 edited + destinationOverride + 2 pristine)`);
}

async function seedApprovedPaidDeposit() {
  const email = 'seed.approved@example.com';
  if (await prisma.lead.findFirst({ where: { email } })) return console.log(`SKIP ${email}`);

  const japan = await loadPackage('Japan Cultural Journey');
  const lead = await createBaseLead({
    email, name: 'Roshan Fernando', phone: '+94773456789', destination: 'Japan', numberOfTravelers: 2, lifecycleStatus: 'APPROVED',
  });

  const selection = await createMaterializedSelection(lead.id, japan, { edited: true });
  await recomputePricing(selection.id, 2, {
    marginType: japan.defaultMarginType, marginValue: japan.defaultMarginInput,
    depositType: 'PERCENTAGE', depositValue: 30, verifiedPaymentTotal: 1,
  });
  // Re-read the just-computed deposit so the "paid" run actually covers it.
  const pricingRow = await prisma.leadPricing.findUnique({ where: { leadPackageSelectionId: selection.id } });
  await recomputePricing(selection.id, 2, {
    marginType: japan.defaultMarginType, marginValue: japan.defaultMarginInput,
    depositType: 'PERCENTAGE', depositValue: 30, verifiedPaymentTotal: Number(pricingRow.depositAmount),
  });
  await prisma.leadPackageSelection.update({
    where: { id: selection.id },
    data: { currentQuoteId: '00000000-0000-4000-8000-0000seedquo2', quoteAcceptedAt: new Date() },
  });

  await setPrimarySelection(lead.id, selection.id);
  console.log(`SEEDED ${email} — APPROVED, quoted + accepted + deposit paid`);
}

async function main() {
  await seedNewLeadWithPristinePackage();
  await seedDraftingSingleEditedPackage();
  await seedMultiPackageDrafting();
  await seedManualPlusPackage();
  await seedQuotedMultiPackage();
  await seedThreePackages();
  await seedApprovedPaidDeposit();
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
