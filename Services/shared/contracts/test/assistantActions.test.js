import { describe, it, expect } from 'vitest';
import {
  ASSISTANT_ACTION_TOOLS,
  ASSISTANT_PAGE_ACTIONS,
  ASSISTANT_SEARCH_TOOL,
  AssistantAction,
  AssistantPageCapabilities,
  AssistantPageContext,
} from '../src/assistantActions.js';

describe('ASSISTANT_ACTION_TOOLS', () => {
  it('is the frozen list of every action name, search first', () => {
    expect(ASSISTANT_ACTION_TOOLS).toEqual([
      'search_travel_info',
      'set_destination',
      'set_travellers',
      'set_preferences',
      'set_contact_details',
      'go_to_step',
      'generate_itinerary',
      'regenerate_days',
      'edit_day',
    ]);
  });

  it('keeps the search tool out of the page actions (it is server-executed)', () => {
    expect(ASSISTANT_PAGE_ACTIONS).not.toContain(ASSISTANT_SEARCH_TOOL);
  });
});

describe('AssistantAction', () => {
  it('parses one trip detail at a time, each with the argument it needs', () => {
    const travellers = { tool: 'set_travellers', message: 'Sure', travelers: 2 };
    expect(AssistantAction.parse(travellers)).toEqual(travellers);
    expect(AssistantAction.parse({ tool: 'set_destination', destination: 'Bali' })).toEqual({
      tool: 'set_destination',
      destination: 'Bali',
    });
    expect(AssistantAction.parse({ tool: 'set_preferences', preferences: 'slow pace' })).toEqual({
      tool: 'set_preferences',
      preferences: 'slow pace',
    });
    expect(AssistantAction.parse({ tool: 'set_contact_details', field: 'email', value: 'ana@example.com' })).toEqual({
      tool: 'set_contact_details',
      field: 'email',
      value: 'ana@example.com',
    });
  });

  it('rejects a trip detail with nothing in it', () => {
    expect(() => AssistantAction.parse({ tool: 'set_travellers' })).toThrow();
    expect(() => AssistantAction.parse({ tool: 'set_preferences', preferences: '' })).toThrow();
  });

  it('rejects a contact detail for a field the page does not hold', () => {
    expect(() =>
      AssistantAction.parse({ tool: 'set_contact_details', field: 'passport', value: 'X123' }),
    ).toThrow();
  });

  it('strips an unknown argument rather than rejecting the action', () => {
    const parsed = AssistantAction.parse({ tool: 'generate_itinerary', message: 'Building it', colour: 'red' });
    expect(parsed).toEqual({ tool: 'generate_itinerary', message: 'Building it' });
  });

  it('parses an edit_day that names the day, the operation and the visitor\u2019s own values', () => {
    const action = {
      tool: 'edit_day',
      dayNumber: 2,
      operation: 'add_activities',
      values: ['whale watching'],
    };
    expect(AssistantAction.parse(action)).toEqual(action);
  });

  it('rejects an edit_day naming an operation the page cannot apply', () => {
    expect(() =>
      AssistantAction.parse({ tool: 'edit_day', dayNumber: 1, operation: 'delete_day', values: ['x'] }),
    ).toThrow();
  });

  it('rejects an edit_day with no operation', () => {
    expect(() => AssistantAction.parse({ tool: 'edit_day', dayNumber: 1, values: ['Beach day'] })).toThrow();
  });

  it('rejects an edit_day with nothing to apply', () => {
    expect(() => AssistantAction.parse({ tool: 'edit_day', dayNumber: 1, operation: 'set_title', values: [] })).toThrow();
  });

  it('rejects an edit_day with no dayNumber', () => {
    expect(() => AssistantAction.parse({ tool: 'edit_day', operation: 'set_title', values: ['Beach day'] })).toThrow();
  });

  it('rejects regenerate_days with an empty dayNumbers list', () => {
    expect(() => AssistantAction.parse({ tool: 'regenerate_days', message: 'x', dayNumbers: [] })).toThrow();
  });

  it('rejects regenerate_days asking for 31 days', () => {
    const dayNumbers = Array.from({ length: 31 }, (_, index) => index + 1);
    expect(() => AssistantAction.parse({ tool: 'regenerate_days', message: 'x', dayNumbers })).toThrow();
  });

  it('parses an action without the model\u2019s own line', () => {
    // The line is a reply, not an argument: the client executes the action, so
    // an action carrying only what changes state has to be valid.
    expect(AssistantAction.parse({ tool: 'generate_itinerary' })).toEqual({ tool: 'generate_itinerary' });
    expect(AssistantAction.parse({ tool: 'go_to_step', step: 3 })).toEqual({ tool: 'go_to_step', step: 3 });
  });

  it('rejects a search_travel_info query shorter than 3 characters', () => {
    expect(() => AssistantAction.parse({ tool: 'search_travel_info', message: 'x', query: 'ab' })).toThrow();
  });
});

describe('AssistantPageCapabilities', () => {
  it('parses a planner registration listing every page action', () => {
    const capabilities = { version: 1, surface: 'planner', actions: [...ASSISTANT_PAGE_ACTIONS] };
    expect(AssistantPageCapabilities.parse(capabilities)).toEqual(capabilities);
  });

  it('rejects an action name outside the page-action list', () => {
    expect(() =>
      AssistantPageCapabilities.parse({ version: 1, surface: 'planner', actions: ['search_travel_info'] }),
    ).toThrow();
  });

  it('rejects an unknown surface', () => {
    expect(() => AssistantPageCapabilities.parse({ version: 1, surface: 'packages', actions: [] })).toThrow();
  });
});

describe('AssistantPageContext', () => {
  it('parses a planner step with a planned day', () => {
    const context = {
      surface: 'planner',
      revision: 'planner',
      step: 3,
      destination: 'Kandy',
      duration: 3,
      travelers: 2,
      days: [{ dayNumber: 1, title: 'Arrival' }],
    };
    expect(AssistantPageContext.parse(context)).toEqual(context);
  });

  it('rejects a non-ISO start date', () => {
    expect(() =>
      AssistantPageContext.parse({ surface: 'planner', revision: 'planner', step: 2, startDate: '3 March' }),
    ).toThrow();
  });

  it('rejects a revision longer than the cap', () => {
    expect(() =>
      AssistantPageContext.parse({ surface: 'planner', revision: 'x'.repeat(121), step: 1 }),
    ).toThrow();
  });
});
