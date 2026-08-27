import { describe, it, expect, afterAll } from 'vitest';
import { WebsiteContactRequest, WebsiteContactResult } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

describe.sequential('client contract: contact', () => {
  const runId = process.env.E2E_RUN_ID || 'local';

  it('POST /leads/website-contact accepts a WebsiteContactRequest-shaped payload and returns WebsiteContactResult', async () => {
    const payload = WebsiteContactRequest.parse({
      name: `[E2E-${runId}] Contact Test`,
      email: `e2e-${runId}+contact@travelcrm.test`,
      subject: 'Automated E2E contract test',
      message: 'Please ignore — automated contract regression test.',
      phone: '+10000000000',
      destination: 'Bali',
      destinationCountry: 'Indonesia',
    });

    const res = await apiClient.post('/leads/website-contact', { body: payload });
    expect(res.status).toBe(201);
    const parsed = WebsiteContactResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`WebsiteContactResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.leadId).toBeTruthy();
    trackForCleanup('lead', parsed.data.leadId);
  });

  afterAll(async () => {
    await cleanupAll();
  });
});
