// One-off backfill for the multi-package-per-lead migration.
//
// Run AFTER the additive `prisma db push` that adds LeadPackageSelection and
// the new leadPackageSelectionId columns on LeadItineraryDay/LeadCostLine/
// LeadPricing/LeadOptionalFlight, but BEFORE the destructive push that drops
// Lead.packageId/packageName/sourcePackageId/isManualItinerary/currentQuoteId/
// quoteAcceptedAt and the old leadId columns on those four child tables.
//
// Uses raw SQL (not the generated Prisma Client) deliberately: by the time
// this runs, the checked-in schema.prisma already reflects the FINAL shape
// (old columns removed), so the typed client no longer knows about the old
// columns this script needs to read from and re-point. Raw SQL only needs
// the columns to physically exist in the database at the time this executes,
// independent of what the schema file currently declares.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting package-selection backfill...');

  const leads = await prisma.$queryRaw`
    SELECT id, "packageId", "packageName", "sourcePackageId", "isManualItinerary",
           "currentQuoteId", "quoteAcceptedAt"
    FROM crm_leads."Lead"
    WHERE "packageId" IS NOT NULL OR "isManualItinerary" = true
  `;

  console.log(`Found ${leads.length} lead(s) eligible for backfill`);

  let migrated = 0;
  let skippedOrphanChildren = 0;

  for (const lead of leads) {
    const selectionId = randomUUID();
    const isManual = Boolean(lead.isManualItinerary);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO crm_leads."LeadPackageSelection"
          (id, "leadId", "packageId", "isManual", "packageName", "sourcePackageId",
           "currentQuoteId", "quoteAcceptedAt", "createdAt", "updatedAt")
        VALUES
          (${selectionId}, ${lead.id}, ${isManual ? null : lead.packageId}, ${isManual},
           ${isManual ? null : lead.packageName}, ${lead.sourcePackageId},
           ${lead.currentQuoteId}, ${lead.quoteAcceptedAt}, now(), now())
      `;

      await tx.$executeRaw`
        UPDATE crm_leads."LeadItineraryDay" SET "leadPackageSelectionId" = ${selectionId}
        WHERE "leadId" = ${lead.id}
      `;
      await tx.$executeRaw`
        UPDATE crm_leads."LeadCostLine" SET "leadPackageSelectionId" = ${selectionId}
        WHERE "leadId" = ${lead.id}
      `;
      await tx.$executeRaw`
        UPDATE crm_leads."LeadPricing" SET "leadPackageSelectionId" = ${selectionId}
        WHERE "leadId" = ${lead.id}
      `;
      await tx.$executeRaw`
        UPDATE crm_leads."LeadOptionalFlight" SET "leadPackageSelectionId" = ${selectionId}
        WHERE "leadId" = ${lead.id}
      `;

      await tx.$executeRaw`
        UPDATE crm_leads."Lead" SET "primarySelectionId" = ${selectionId}
        WHERE id = ${lead.id}
      `;
    });

    console.log(`  OK: Lead ${lead.id} -> selection ${selectionId} (${isManual ? 'manual' : lead.packageId})`);
    migrated++;
  }

  // Verification pass — every itineraryDay/costLine/pricing/optionalFlight row
  // should now point at a selection; none should be left dangling on the old
  // leadId-only shape with a null leadPackageSelectionId.
  const [orphanDays, orphanLines, orphanPricing, orphanFlights] = await Promise.all([
    prisma.$queryRaw`SELECT count(*)::int AS n FROM crm_leads."LeadItineraryDay" WHERE "leadPackageSelectionId" IS NULL`,
    prisma.$queryRaw`SELECT count(*)::int AS n FROM crm_leads."LeadCostLine" WHERE "leadPackageSelectionId" IS NULL`,
    prisma.$queryRaw`SELECT count(*)::int AS n FROM crm_leads."LeadPricing" WHERE "leadPackageSelectionId" IS NULL`,
    prisma.$queryRaw`SELECT count(*)::int AS n FROM crm_leads."LeadOptionalFlight" WHERE "leadPackageSelectionId" IS NULL`,
  ]);
  skippedOrphanChildren = orphanDays[0].n + orphanLines[0].n + orphanPricing[0].n + orphanFlights[0].n;

  console.log(`\nDone. Selections created: ${migrated}`);
  console.log(`Orphaned child rows remaining (should be 0 before the destructive push): ${skippedOrphanChildren}`);
  if (skippedOrphanChildren > 0) {
    console.log('  -> Investigate before running the destructive db push; these rows belong to leads outside the eligible set above (e.g. neither packageId nor isManualItinerary set).');
  }

  await prisma.$disconnect();
}

backfill().catch(async (err) => {
  console.error('Backfill failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
