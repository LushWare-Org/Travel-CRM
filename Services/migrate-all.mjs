/**
 * Runs `prisma migrate deploy` across every Prisma-backed microservice.
 *
 * All 8 services below share one physical Postgres database (same host,
 * same database — just a different `@@schema` namespace per service), so
 * Prisma's `_prisma_migrations` bookkeeping table is effectively shared
 * too: any service's `migrate status` will list every other service's
 * migration names alongside its own. That's expected — `migrate deploy`
 * only ever applies migrations declared in the service's own local
 * `prisma/migrations/` folder, so this script is safe to run repeatedly
 * (each service no-ops once nothing is pending).
 *
 * `prisma migrate dev` is intentionally never used here — it's an
 * interactive, reset-capable command meant for local development against
 * a disposable database, not a shared remote one. Use `db:migrate` inside
 * an individual service for local dev; use this script (or a service's
 * `db:migrate:deploy`) to apply pending migrations for real.
 *
 * Run from Services/: node migrate-all.mjs
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Order matters only for readability of the log output — each service's
// migrations are independent (different schema, different migration
// names), so there's no cross-service dependency to sequence around.
const SERVICES = [
  'auth-service',
  'user-service',
  'package-service',
  'lead-service',
  'booking-service',
  'billing-service',
  'career-service',
  'flight-service',
];

let failed = false;

for (const service of SERVICES) {
  const dir = path.join(__dirname, service);
  const schemaPath = path.join(dir, 'prisma', 'schema.prisma');
  if (!existsSync(schemaPath)) {
    console.log(`⏭  ${service}: no prisma/schema.prisma, skipping`);
    continue;
  }

  console.log(`\n→ ${service}`);
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`✗ ${service}: migrate deploy failed (exit ${result.status})`);
  } else {
    console.log(`✓ ${service}: up to date`);
  }
}

if (failed) {
  console.error('\nOne or more services failed to migrate — see above.');
  process.exit(1);
}

console.log('\nAll services migrated successfully.');
