/**
 * One Prisma client per service + a raw pg pool, all pointed at the SAME
 * database. Every service owns its own Postgres schema namespace (crm_users,
 * crm_leads, …) but they share one physical Postgres instance, so a single
 * connection string is correct for all of them — exactly how seed.mjs wires
 * its clients.
 *
 * `requireDatabaseUrl` refuses to guess a database. A seed run against the
 * wrong Postgres cannot be undone, so an unset DATABASE_URL is a hard stop,
 * never a fallback.
 */
import pg from '../../analytics-service/node_modules/pg/lib/index.js';
import { PrismaClient as AuthClient } from '../../auth-service/node_modules/@prisma/client/index.js';
import { PrismaClient as UserClient } from '../../user-service/node_modules/@prisma/client/index.js';
import { PrismaClient as PkgClient } from '../../package-service/node_modules/@prisma/client/index.js';
import { PrismaClient as LeadClient } from '../../lead-service/node_modules/@prisma/client/index.js';
import { PrismaClient as BookClient } from '../../booking-service/node_modules/@prisma/client/index.js';
import { PrismaClient as BillClient } from '../../billing-service/node_modules/@prisma/client/index.js';
import { PrismaClient as CareerClient } from '../../career-service/node_modules/@prisma/client/index.js';
import { PrismaClient as FlightClient } from '../../flight-service/node_modules/@prisma/client/index.js';
import { PrismaClient as AssistantClient } from '../../assistant-service/node_modules/@prisma/client/index.js';
import { requireDatabaseUrl } from '../../database-url.mjs';

export function connect(url = requireDatabaseUrl('seed-demo.mjs')) {
  const opts = { datasources: { db: { url } } };
  // pg is used only for the work Prisma's per-service clients are the wrong
  // tool for: cross-schema reset/delete by id prefix, and the post-run audit.
  const sql = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 4,
  });
  return {
    url,
    sql,
    auth: new AuthClient(opts),
    users: new UserClient(opts),
    pkg: new PkgClient(opts),
    lead: new LeadClient(opts),
    book: new BookClient(opts),
    bill: new BillClient(opts),
    career: new CareerClient(opts),
    flight: new FlightClient(opts),
    assistant: new AssistantClient(opts),
  };
}

export async function disconnect(db) {
  await db.sql.end().catch(() => {});
  await Promise.all(
    ['auth', 'users', 'pkg', 'lead', 'book', 'bill', 'career', 'flight', 'assistant'].map((k) =>
      db[k].$disconnect().catch(() => {}),
    ),
  );
}
