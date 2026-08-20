/**
 * One-time (idempotent) script: grant salesRep users the default
 * `view_reports` and `manage_packages` permissions if they don't already
 * have them. Additive only — never removes existing permissions, never
 * touches non-salesRep users.
 * Run from Services/: node grant-salesrep-default-permissions.mjs
 */
import { PrismaClient } from './user-service/node_modules/@prisma/client/index.js';

const DB_URL = process.env.DATABASE_URL ||
  'postgresql://postgres.javgkcjscdhrnlnsgczs:KZ9MNnBwR4eslIsI@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const DEFAULT_GRANTS = ['view_reports', 'manage_packages'];

async function main() {
  console.log('Granting default permissions to salesRep users...\n');
  const reps = await db.user.findMany({
    where: { role: 'salesRep' },
    select: { id: true, email: true, permissions: true },
  });

  for (const rep of reps) {
    const current = rep.permissions || [];
    const merged = Array.from(new Set([...current, ...DEFAULT_GRANTS]));
    if (merged.length === current.length) {
      console.log(`  =  ${rep.email} (already granted)`);
      continue;
    }
    await db.user.update({ where: { id: rep.id }, data: { permissions: merged } });
    const added = DEFAULT_GRANTS.filter((p) => !current.includes(p));
    console.log(`  ✓  ${rep.email} → +${added.join(',')}`);
  }
  console.log('\nDone.');
}

main().catch(console.error).finally(() => db.$disconnect());
