import { describe, it, expect, afterAll } from 'vitest';
import { ProfileUpdateRequest, ProfileUpdateResult } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';

// Regression guard for Phase 2's user-service fix: PUT /users/profile used
// to reject `email` with a 400 "Unrecognized key". Also proves the Prisma
// P2002 (duplicate email) -> 400 mapping added alongside that fix.
//
// Both seeded customer accounts (david.kumar@gmail.com / emily.chen@gmail.com)
// are shared, named fixtures other specs and real usage may depend on — this
// spec restores david.kumar's email in a `finally`/`afterAll` so a failure
// mid-test never leaves the seed data corrupted for a later run.
describe.sequential('client contract: user profile', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  const ORIGINAL_EMAIL = 'david.kumar@gmail.com';
  const TEMP_EMAIL = `e2e-${runId}+profile@travelcrm.test`;
  let restored = false;

  const restoreEmail = async () => {
    if (restored) return;
    await apiClient.put('/users/profile', {
      role: 'customer',
      body: ProfileUpdateRequest.parse({ name: 'David Kumar', email: ORIGINAL_EMAIL, phone: '' }),
    });
    restored = true;
  };

  it('PUT /users/profile accepts an email change and returns the updated user under data.user', async () => {
    const res = await apiClient.put('/users/profile', {
      role: 'customer',
      body: ProfileUpdateRequest.parse({ name: 'David Kumar', email: TEMP_EMAIL, phone: '' }),
    });
    expect(res.status).toBe(200);
    const parsed = ProfileUpdateResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`ProfileUpdateResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.user.email).toBe(TEMP_EMAIL);

    await restoreEmail();
    expect(restored).toBe(true);
  });

  it('PUT /users/profile maps a duplicate-email conflict to a 400', async () => {
    // ORIGINAL_EMAIL is restored to david.kumar's account by the previous
    // test's cleanup — attempting to claim it from a different account must
    // now conflict on the DB's unique constraint.
    const res = await apiClient.put('/users/profile', {
      role: 'salesRep',
      body: ProfileUpdateRequest.parse({ name: 'Bob Sales', email: ORIGINAL_EMAIL, phone: '' }),
    });
    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    await restoreEmail();
  });
});
