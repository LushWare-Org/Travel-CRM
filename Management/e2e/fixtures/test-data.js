// Seed accounts from Services/update-passwords.mjs (applied after Services/seed.mjs).
// These are NOT the dev-hint credentials shown on Login.jsx when
// VITE_SHOW_TEST_CREDENTIALS=true — those (admin@lushware.com etc.) target the
// legacy Mongo stack and won't authenticate against the microservices backend.
export const SEED_USERS = {
  superAdmin: {
    email: 'superadmin@travelcrm.com',
    password: 'SuperAdmin@123',
    role: 'superAdmin',
  },
  admin: {
    email: 'alice.admin@travelcrm.com',
    password: 'Admin@123',
    role: 'admin',
  },
  salesRep: {
    email: 'bob.sales@travelcrm.com',
    password: 'Sales@123',
    role: 'salesRep',
  },
};
