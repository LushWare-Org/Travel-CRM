import { describe, it, expect } from 'vitest';
import { GenerateItineraryPreviewResult } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';

// Deliberately not added: an automated test that exhausts the gateway's
// aiItineraryPreviewLimiter (max 5/15min/IP). Doing so against the shared
// live stack would lock out the limiter for 15 minutes for every other e2e
// run and real user sharing that gateway instance. Covered instead by a
// manual curl-loop check (see plan's Verification section).
describe.sequential('client contract: AI itinerary preview', () => {
  let configured;

  it('GET /packages/ai-status (no auth) reports whether Gemini is configured', async () => {
    const res = await apiClient.get('/packages/ai-status');
    expect(res.status).toBe(200);
    expect(typeof res.body?.configured).toBe('boolean');
    configured = res.body.configured;
  });

  it('POST /packages/generate-itinerary-preview (no auth) is genuinely public through the live gateway', async () => {
    expect(typeof configured).toBe('boolean');
    const res = await apiClient.post('/packages/generate-itinerary-preview', {
      body: { destination: 'Kandy, Sri Lanka', duration: 2 },
    });

    if (!configured) {
      expect(res.status).toBe(503);
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const parsed = GenerateItineraryPreviewResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`GenerateItineraryPreviewResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.days.length).toBeGreaterThan(0);
  });
});
