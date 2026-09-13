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
];

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
    const { toolCall, serverResult, message } = res.body?.data || {};
    expect(TOOLS).toContain(toolCall?.tool);
    expect(toolCall?.args).toBeTruthy();
    expect(serverResult).toBeTruthy();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});
