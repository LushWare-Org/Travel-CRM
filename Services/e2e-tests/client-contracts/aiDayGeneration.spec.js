import { describe, it, expect } from 'vitest';
import { GenerateDayPreviewResult, GenerateDaysRangePreviewResult } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';

// Deliberately not added: an automated test that exhausts the gateway's
// itineraryChatLimiter (shared with itinerary-chat/wizard-turn, max
// 30/15min/IP). Doing so against the shared live stack would lock out the
// limiter for 15 minutes for every other e2e run and real user sharing that
// gateway instance. Covered instead by a manual curl-loop check (see plan's
// Verification section).
describe.sequential('client contract: per-day AI itinerary generation', () => {
  let configured;

  it('GET /packages/ai-status (no auth) reports whether Gemini is configured', async () => {
    const res = await apiClient.get('/packages/ai-status');
    expect(res.status).toBe(200);
    expect(typeof res.body?.configured).toBe('boolean');
    configured = res.body.configured;
  });

  it('POST /packages/generate-day-preview (no auth) is genuinely public through the live gateway', async () => {
    expect(typeof configured).toBe('boolean');
    const res = await apiClient.post('/packages/generate-day-preview', {
      body: { destination: 'Kandy, Sri Lanka', dayNumber: 2, totalDuration: 3 },
    });

    if (!configured) {
      expect(res.status).toBe(503);
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const parsed = GenerateDayPreviewResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`GenerateDayPreviewResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    // The controller forces dayNumber to the requested slot regardless of
    // what the model returned — assert the live response honors that too.
    expect(parsed.data.day.dayNumber).toBe(2);
  });

  it('POST /packages/generate-days-preview (no auth) is genuinely public through the live gateway', async () => {
    expect(typeof configured).toBe('boolean');
    const res = await apiClient.post('/packages/generate-days-preview', {
      body: { destination: 'Kandy, Sri Lanka', dayNumbers: [2, 3], totalDuration: 3 },
    });

    if (!configured) {
      expect(res.status).toBe(503);
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const parsed = GenerateDaysRangePreviewResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`GenerateDaysRangePreviewResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    // Shortfall is a valid (if degenerate) result — assert only that every
    // returned day, if any, carries one of the requested dayNumbers.
    for (const day of parsed.data.days) {
      expect([2, 3]).toContain(day.dayNumber);
    }
  });
});
