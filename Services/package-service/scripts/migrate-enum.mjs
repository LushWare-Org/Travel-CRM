import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_VALUES = ['HONEYMOON', 'COUPLE', 'FAMILY', 'GROUP', 'WILD_SAFARI'];

async function main() {
  console.log('Migrating PackageCategory enum from lowercase to UPPER_CASE...');

  // Check row count
  const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM crm_packages."Package"`);
  console.log(`  Package rows: ${count}`);

  const [{ count: dayCount }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM crm_packages."Itinerary_Day"`);
  console.log(`  Itinerary_Day rows: ${dayCount}`);

  // Step 1: Drop the default
  await prisma.$executeRawUnsafe(`ALTER TABLE crm_packages."Package" ALTER COLUMN "category" DROP DEFAULT`);
  console.log('  Dropped default');

  // Step 2: Switch column to text temporarily
  await prisma.$executeRawUnsafe(`ALTER TABLE crm_packages."Package" ALTER COLUMN "category" TYPE text USING "category"::text`);
  console.log('  Switched column to text');

  // Step 3: Drop old enum
  await prisma.$executeRawUnsafe(`DROP TYPE crm_packages."PackageCategory"`);
  console.log('  Dropped old enum');

  // Step 4: Create new UPPER_CASE enum
  const values = NEW_VALUES.map(v => `'${v}'`).join(', ');
  await prisma.$executeRawUnsafe(`CREATE TYPE crm_packages."PackageCategory" AS ENUM (${values})`);
  console.log('  Created new UPPER_CASE enum');

  // Step 5: Convert existing text values to new enum
  const mapping = { honeymoon:'HONEYMOON', couple:'COUPLE', family:'FAMILY', group:'GROUP', 'wild safari':'WILD_SAFARI' };
  for (const [oldText, newVal] of Object.entries(mapping)) {
    await prisma.$executeRawUnsafe(
      `UPDATE crm_packages."Package" SET "category" = $1 WHERE "category" = $2`,
      newVal, oldText
    );
  }
  console.log('  Updated row values');

  // Step 6: Switch column to new enum type
  await prisma.$executeRawUnsafe(`ALTER TABLE crm_packages."Package" ALTER COLUMN "category" TYPE crm_packages."PackageCategory" USING "category"::crm_packages."PackageCategory"`);
  console.log('  Switched column to new enum');

  // Step 7: Set new default
  await prisma.$executeRawUnsafe(`ALTER TABLE crm_packages."Package" ALTER COLUMN "category" SET DEFAULT 'FAMILY'::crm_packages."PackageCategory"`);
  console.log('  Set new default');

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
