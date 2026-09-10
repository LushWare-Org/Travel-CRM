import { describe, it, expect } from 'vitest';
import { ManagementCopilotSeenRequest } from '../src/managementCopilot.js';

// POST /api/v1/assistant/management/seen — the authenticated acknowledgement
// that a grounded briefing was presented. The body is deliberately minimal:
// page key + page scope only. There is NO client-authored timestamp, because
// the server stamps and advances the window itself.

function validBody(overrides = {}) {
  return {
    page: { key: 'leads', scope: { leadId: 'lead-1' } },
    ...overrides,
  };
}

describe('ManagementCopilotSeenRequest', () => {
  it('accepts a leads page with a lead scope', () => {
    const parsed = ManagementCopilotSeenRequest.parse(validBody());
    expect(parsed).toEqual({ page: { key: 'leads', scope: { leadId: 'lead-1' } } });
  });

  it('accepts a page with an omitted scope and defaults it to an empty object', () => {
    const parsed = ManagementCopilotSeenRequest.parse({ page: { key: 'leads' } });
    expect(parsed.page.scope).toEqual({});
  });

  it('rejects a missing page.key', () => {
    expect(ManagementCopilotSeenRequest.safeParse({ page: { scope: { leadId: 'lead-1' } } }).success).toBe(false);
  });

  it('rejects an unknown page key', () => {
    expect(ManagementCopilotSeenRequest.safeParse(validBody({ page: { key: 'not-a-page', scope: {} } })).success).toBe(false);
  });

  it('rejects a client-authored timestamp at the top level', () => {
    expect(ManagementCopilotSeenRequest.safeParse(validBody({ lastSeenAt: '2026-09-09T00:00:00Z' })).success).toBe(false);
  });

  it('rejects a client-authored timestamp inside page', () => {
    expect(
      ManagementCopilotSeenRequest.safeParse({ page: { key: 'leads', scope: { leadId: 'lead-1' }, lastSeenAt: '2026-09-09T00:00:00Z' } })
        .success,
    ).toBe(false);
  });

  it('rejects a missing page object', () => {
    expect(ManagementCopilotSeenRequest.safeParse({}).success).toBe(false);
  });
});
