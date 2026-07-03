/**
 * One-time script: update mock user passwords to real bcrypt hashes.
 * Run from Services/: node update-passwords.mjs
 */
import { PrismaClient } from './user-service/node_modules/@prisma/client/index.js';
import bcrypt from './auth-service/node_modules/bcryptjs/dist/bcrypt.js';

const DB_URL = process.env.DATABASE_URL ||
  'postgresql://postgres.javgkcjscdhrnlnsgczs:KZ9MNnBwR4eslIsI@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const users = [
  { email: 'superadmin@travelcrm.com', password: 'SuperAdmin@123' },
  { email: 'alice.admin@travelcrm.com', password: 'Admin@123'      },
  { email: 'bob.sales@travelcrm.com',   password: 'Sales@123'      },
  { email: 'carol.sales@travelcrm.com', password: 'Sales@123'      },
  { email: 'david.kumar@gmail.com',      password: 'Customer@123'   },
  { email: 'emily.chen@gmail.com',       password: 'Customer@123'   },
  { email: 'saman@ceylonhotels.lk',      password: 'Vendor@123'     },
];

async function main() {
  console.log('Updating passwords...\n');
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const result = await db.user.updateMany({
      where: { email: u.email },
      data:  { password: hash },
    });
    const status = result.count === 1 ? '✓' : '✗ (not found)';
    console.log(`  ${status}  ${u.email}`);
  }
  console.log('\nDone.');
}

main().catch(console.error).finally(() => db.$disconnect());
