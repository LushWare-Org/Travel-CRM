import { describe, it, expect } from 'vitest';
import { AuthResult } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';

// Regression guard: the same AuthResult schema Client/src/services/api/auth.ts
// parses in production, asserted against the real running auth-service.
describe.sequential('client contract: auth', () => {
  it('POST /auth/login returns an envelope whose data matches AuthResult', async () => {
    const res = await apiClient.post('/auth/login', {
      body: { email: 'alice.admin@travelcrm.com', password: 'Admin@123' },
    });
    expect(res.status).toBe(200);
    const parsed = AuthResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`AuthResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.token).toBeTruthy();
    expect(parsed.data.user.email).toBe('alice.admin@travelcrm.com');
  });

  it('POST /auth/login rejects bad credentials with a non-success response', async () => {
    const res = await apiClient.post('/auth/login', {
      body: { email: 'alice.admin@travelcrm.com', password: 'wrong-password' },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
