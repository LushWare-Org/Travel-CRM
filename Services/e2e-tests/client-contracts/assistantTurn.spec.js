import { describe, it, expect } from 'vitest';
import { apiClient } from '../helpers/api-client.js';

const TOOLS = [
  'navigate',
  'answer_faq_policy',
  'answer_packages',
  'hand_off',
  'request_booking',
  'respond_conversationally',
  'redirect_off_topic',
  'set_trip_details',
  'go_to_step',
  'generate_itinerary',
  'regenerate_days',
  'edit_day',
  'search_travel_info',
];

const PLANNER_CAPABILITIES = {
  version: 1,
  surface: 'planner',
  actions: ['set_destination', 'set_travellers', 'set_preferences', 'set_contact_details', 'go_to_step', 'generate_itinerary', 'regenerate_days', 'edit_day'],
};

const PLANNER_CONTEXT = {
  surface: 'planner',
  revision: 'planner',
  step: 3,
  destination: 'Kandy',
  duration: 3,
  days: [{ dayNumber: 1, title: 'Arrival' }],
};

const message = (content) => ({
  id: `assistant-e2e-${content}`,
  role: 'user',
  content,
  at: new Date().toISOString(),
});

describe('client contract: site-wide assistant', () => {
  it('POST /assistant/turn returns a recognized outcome through the live gateway', async () => {
    const res = await apiClient.post('/assistant/turn', {
      body: {
        sessionId: `e2e-assistant-${Date.now()}`,
        messages: [
          {
            id: 'assistant-e2e-message',
            role: 'user',
            content: 'Hello',
            at: new Date().toISOString(),
          },
        ],
        availableRoutes: [{ name: 'packages', path: '/packages' }],
      },
    });

    if (res.status === 503) {
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const { toolCall, serverResult, message: reply } = res.body?.data || {};
    expect(TOOLS).toContain(toolCall?.tool);
    expect(toolCall?.args).toBeTruthy();
    expect(serverResult).toBeTruthy();
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(0);
  });

  it('accepts the page manifest and state a planner page reports', async () => {
    const res = await apiClient.post('/assistant/turn', {
      body: {
        sessionId: `e2e-assistant-page-${Date.now()}`,
        messages: [message('make day 2 more relaxed')],
        availableRoutes: [{ name: 'packages', path: '/packages' }],
        capabilities: PLANNER_CAPABILITIES,
        pageContext: PLANNER_CONTEXT,
      },
    });

    // 503 is the unconfigured-provider branch this suite has always tolerated;
    // a 400 here would mean the manifest never reached the controller, and a 502
    // that an offered action could not be dispatched.
    if (res.status === 503) {
      expect(res.body?.message).toBeTruthy();
      return;
    }

    expect(res.status).toBe(200);
    const { toolCall, serverResult } = res.body?.data || {};
    expect(TOOLS).toContain(toolCall?.tool);

    // When the model did choose a page action, the server has to hand back the
    // revision it was chosen against — that is the only thing standing between a
    // turn composed against one page and another page executing it.
    if (PLANNER_CAPABILITIES.actions.includes(toolCall?.tool)) {
      expect(serverResult?.revision).toBe('planner');
      expect(serverResult?.action?.tool).toBe(toolCall.tool);
    }
  });

  it('rejects a capability manifest naming an action that does not exist', async () => {
    const res = await apiClient.post('/assistant/turn', {
      body: {
        sessionId: `e2e-assistant-bad-capability-${Date.now()}`,
        messages: [message('Hello')],
        availableRoutes: [{ name: 'packages', path: '/packages' }],
        capabilities: { version: 1, surface: 'planner', actions: ['send_email'] },
      },
    });

    // Validation happens before any generation, so this asserts a real 400
    // without a provider key.
    expect(res.status).toBe(400);
  });

  it('rejects a page context whose dates are not ISO days', async () => {
    const res = await apiClient.post('/assistant/turn', {
      body: {
        sessionId: `e2e-assistant-bad-context-${Date.now()}`,
        messages: [message('Hello')],
        availableRoutes: [{ name: 'packages', path: '/packages' }],
        pageContext: { ...PLANNER_CONTEXT, startDate: '3 March' },
      },
    });

    expect(res.status).toBe(400);
  });
});
