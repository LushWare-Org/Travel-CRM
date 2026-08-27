import { describe, it, expect, afterAll } from 'vitest';
import { z } from 'zod';
import { WebsiteCustomizationRequest, WebsiteCustomizationResult, CustomizedPackageSummary, ApiPackage } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

// Regression guard for the lead-service port (Phase 3): the two endpoints
// Client/src/services/api/customization.ts calls 404'd before that port
// landed. GET /customized-packages/my-requests filters leads by the JWT's
// email, so the POST below must use the same seeded "customer" account
// helpers/auth-helper.js logs in as — a per-run synthetic email would never
// match.
describe.sequential('client contract: customized packages', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  const CUSTOMER_EMAIL = 'david.kumar@gmail.com';
  let leadId;
  let customizedPackageId;

  it('POST /customized-packages/website accepts a WebsiteCustomizationRequest-shaped payload', async () => {
    const packagesRes = await apiClient.get('/packages?limit=1');
    expect(packagesRes.status).toBe(200);
    const pkg = ApiPackage.parse(packagesRes.body.data[0]);

    const payload = WebsiteCustomizationRequest.parse({
      packageId: pkg.id,
      name: `[E2E-${runId}] Customization Test`,
      email: CUSTOMER_EMAIL,
      phone: '+10000000000',
      travelers: 2,
      travelDate: '2027-06-01',
      message: 'Automated E2E contract test',
      overrides: { name: `[E2E-${runId}] Custom Package` },
    });

    const res = await apiClient.post('/customized-packages/website', { body: payload });
    expect(res.status).toBe(201);
    const parsed = WebsiteCustomizationResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`WebsiteCustomizationResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.customizedPackageId).toBeTruthy();
    expect(parsed.data.leadId).toBeTruthy();
    leadId = parsed.data.leadId;
    customizedPackageId = parsed.data.customizedPackageId;
    trackForCleanup('lead', leadId);
  });

  it('GET /customized-packages/my-requests (authenticated as the same email) returns the just-created item', async () => {
    expect(customizedPackageId).toBeTruthy();
    const res = await apiClient.get('/customized-packages/my-requests', { role: 'customer' });
    expect(res.status).toBe(200);
    const parsed = z.array(CustomizedPackageSummary).safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`CustomizedPackageSummary[] mismatch: ${JSON.stringify(parsed.error.issues)}`);
    const found = parsed.data.find((item) => item.id === customizedPackageId);
    expect(found).toBeTruthy();
  });

  afterAll(async () => {
    await cleanupAll();
  });
});
