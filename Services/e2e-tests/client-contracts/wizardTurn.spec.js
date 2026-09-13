import { describe, it, expect } from 'vitest';
import { apiClient } from '../helpers/api-client.js';

// Full walkthrough against a live stack needs a seeded package inventory and
// a real Gemini call per turn, so — same reasoning as itineraryChat.spec.js
// and aiItineraryPreview.spec.js — this exercises the public contract shape
// end to end through the live gateway rather than asserting on specific
// generated content. Deliberately not added: an automated test that
// exhausts itineraryChatLimiter (shared with wizard-turn, max 30/15min/IP).
describe.sequential('client contract: trip-planning wizard', () => {
  let configured;

  it('GET /packages/ai-status (no auth) reports whether Gemini is configured', async () => {
    const res = await apiClient.get('/packages/ai-status');
    expect(res.status).toBe(200);
    expect(typeof res.body?.configured).toBe('boolean');
    configured = res.body.configured;
  });

  it('POST /packages/wizard-turn (no auth) walks a slot-filling turn through the live gateway', async () => {
    expect(typeof configured).toBe('boolean');
    const res = await apiClient.post('/packages/wizard-turn', {
      body: { messages: [{ role: 'user', content: 'I want a 5 day trip to Bali for 2 people' }] },
    });

    if (!configured) {
      expect(res.status).toBe(503);
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const { toolCall, updatedWizardState, uiComponent, message } = res.body?.data || {};
    expect(['set_slot', 'propose_packages', 'answer_policy_question', 'complete_wizard']).toContain(toolCall?.tool);
    expect(typeof uiComponent).toBe('string');
    expect(typeof message).toBe('string');
    expect(updatedWizardState).toBeTruthy();
  });
});
