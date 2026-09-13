import { describe, it, expect } from 'vitest';
import { ManagementAssistantTurnRequest } from '../src/managementCopilot.js';

// The turn request had no direct test, which is how a wire rename can ship without
// anyone noticing that one half still sends the old value. 'insights' is the
// current token; 'briefing' is the pre-rename value, accepted for one release so a
// client that has not shipped yet cannot 400.

const turn = (mode) => ({
  mode,
  page: { key: 'leads', scope: {}, since: '7_days' },
  messages: [{ role: 'user', content: 'Which leads need attention?' }],
});

describe('the turn request mode', () => {
  it.each(['deterministic', 'briefing', 'insights', 'ask'])('accepts %s', (mode) => {
    const parsed = ManagementAssistantTurnRequest.safeParse(turn(mode));

    expect(parsed.success).toBe(true);
    expect(parsed.data.mode).toBe(mode);
  });

  it('still rejects a mode that is not part of the contract', () => {
    expect(ManagementAssistantTurnRequest.safeParse(turn('digest')).success).toBe(false);
  });

  it('parses the legacy and current tokens to their own values, leaving the controller to normalise', () => {
    // The contract accepts both; mapping the legacy value onto the current one is
    // the controller's job, and its warning is what makes the drop observable.
    const legacy = ManagementAssistantTurnRequest.parse(turn('briefing'));
    const current = ManagementAssistantTurnRequest.parse(turn('insights'));

    expect(legacy.mode).toBe('briefing');
    expect(current.mode).toBe('insights');
  });

  it('defaults an omitted scope to an empty object', () => {
    const parsed = ManagementAssistantTurnRequest.parse({
      mode: 'insights',
      page: { key: 'leads', since: '7_days' },
    });

    expect(parsed.page.scope).toEqual({});
  });
});
