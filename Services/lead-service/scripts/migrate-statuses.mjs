import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAPPING = {
  new: 'NEW',
  contacted: 'NEW',
  interested: 'DRAFTING',
  quoted: 'QUOTED',
  converted: 'APPROVED',
  lost: 'CLOSED_LOST',
  not_interested: 'CLOSED_LOST',
};

async function migrate() {
  console.log('Starting status migration...');

  // Find all leads without a lifecycleStatus
  const leads = await prisma.lead.findMany({
    where: { lifecycleStatus: null },
    select: { id: true, status: true, name: true },
  });

  console.log(`Found ${leads.length} leads to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const lead of leads) {
    const newStatus = MAPPING[lead.status];
    if (!newStatus) {
      console.log(`  SKIP: Lead ${lead.id} (${lead.name}) — unknown status "${lead.status}"`);
      skipped++;
      continue;
    }
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lifecycleStatus: newStatus },
    });
    console.log(`  OK:   Lead ${lead.id} (${lead.name}) — "${lead.status}" → "${newStatus}"`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
