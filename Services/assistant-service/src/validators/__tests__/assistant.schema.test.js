import { describe, expect, it, vi } from 'vitest';

// The schema module pulls in the prompt module (the tool list is the single
// source of truth for the event enum), which reaches the catalogue and therefore
// the Prisma client. Mocked for the same reason the controller suite mocks it:
// importing the real one constructs a client at import time and wants a
// DATABASE_URL this suite has no business needing.
vi.mock('../../db/client.js', () => ({ default: {} }));

const { assistantTurnSchema, recordEventSchema } = await import('../assistant.schema.js');

const MESSAGE = { id: 'm-1', role: 'user', content: 'Two travellers to Kandy', at: '2026-09-04T00:00:00.000Z' };

const baseTurn = (overrides = {}) => ({
  sessionId: 'session-1',
  messages: [MESSAGE],
  availableRoutes: [],
  ...overrides,
});

const plannerCapabilities = {
  version: 1,
  surface: 'planner',
  actions: ['set_destination', 'set_travellers', 'edit_day'],
};

const plannerContext = {
  surface: 'planner',
  revision: 'planner',
  step: 3,
  destination: 'Kandy',
  days: [{ dayNumber: 1, title: 'Arrival' }],
};

describe('assistantTurnSchema — page manifest', () => {
  it('still parses a turn from a client that sends neither field', () => {
    expect(assistantTurnSchema.safeParse(baseTurn()).success).toBe(true);
  });

  it('parses a turn that reports what the page can do and what is on it', () => {
    const parsed = assistantTurnSchema.safeParse(
      baseTurn({ capabilities: plannerCapabilities, pageContext: plannerContext }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data.capabilities).toEqual(plannerCapabilities);
    expect(parsed.data.pageContext).toEqual(plannerContext);
  });

  it('rejects an action the page could not execute', () => {
    const result = assistantTurnSchema.safeParse(
      baseTurn({ capabilities: { ...plannerCapabilities, actions: ['search_travel_info'] } }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects an unknown surface', () => {
    const result = assistantTurnSchema.safeParse(
      baseTurn({ capabilities: { ...plannerCapabilities, surface: 'management' } }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects a page context whose dates are not ISO days', () => {
    const result = assistantTurnSchema.safeParse(
      baseTurn({ pageContext: { ...plannerContext, startDate: '3 March' } }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects a page context claiming more days than the trip cap', () => {
    const days = Array.from({ length: 31 }, (_, index) => ({ dayNumber: index + 1 }));
    const result = assistantTurnSchema.safeParse(baseTurn({ pageContext: { ...plannerContext, days } }));

    expect(result.success).toBe(false);
  });

  it('strips a field it does not know rather than rejecting the turn', () => {
    const parsed = assistantTurnSchema.safeParse(
      baseTurn({ capabilities: plannerCapabilities, somethingElse: 'ignored' }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data.somethingElse).toBeUndefined();
  });
});

describe('recordEventSchema — tool enum', () => {
  it('accepts a page action as the reported tool', () => {
    const parsed = recordEventSchema.safeParse({
      sessionId: 'session-1',
      turnId: null,
      eventType: 'response',
      tool: 'edit_day',
      route: null,
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts the grounded search as the reported tool', () => {
    const parsed = recordEventSchema.safeParse({
      sessionId: 'session-1',
      turnId: null,
      eventType: 'response',
      tool: 'search_travel_info',
      route: null,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects a tool name that is not in the vocabulary', () => {
    const parsed = recordEventSchema.safeParse({
      sessionId: 'session-1',
      turnId: null,
      eventType: 'response',
      tool: 'send_email',
      route: null,
    });

    expect(parsed.success).toBe(false);
  });
});
