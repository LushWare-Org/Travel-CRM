import { describe, expect, it } from 'vitest';
import {
  assistantTurnResponseSchema,
  buildAssistantTurnPrompt,
  canonicalizeAssistantTurnResponse,
} from '../prompts/assistantTurn.v1.js';

const PROMPT_INPUT = {
  messages: [{ role: 'user', content: 'Hello' }],
  availableRoutes: [{ name: 'packages', path: '/packages' }],
  candidateSnippets: [],
};

describe('assistant turn prompt contract', () => {
  it('advertises only legacy outcomes while the rollout flag is disabled', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: false });

    expect(prompt).toContain('Return exactly one tool from: navigate, answer_faq_policy.');
    expect(prompt).not.toContain('3. respond_conversationally');
    expect(prompt).not.toContain('4. redirect_off_topic');
  });

  it('advertises both reviewed conversational outcomes while the rollout flag is enabled', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });

    expect(prompt).toContain('respond_conversationally, redirect_off_topic');
    expect(prompt).toContain('3. respond_conversationally');
    expect(prompt).toContain('4. redirect_off_topic');
    expect(prompt).toContain('Use travel_general only when the untrusted router hint is exactly travel_general');
  });
});

describe('canonicalizeAssistantTurnResponse', () => {
  it.each([
    [{ tool: 'navigate', args: { route: 42, message: false, selectedSnippetIds: ['cross-tool'] } }, { tool: 'navigate', args: { route: '', message: '' } }],
    [{ tool: 'answer_faq_policy', args: { question: null, selectedSnippetIds: 'snippet-0', message: {} } }, { tool: 'answer_faq_policy', args: { question: '', selectedSnippetIds: [], message: '' } }],
  ])('coerces malformed %s args into the strict per-tool union', (raw, expected) => {
    const canonical = canonicalizeAssistantTurnResponse(raw, { conversationalOutcomesEnabled: true });

    expect(canonical).toEqual(expected);
    expect(assistantTurnResponseSchema.safeParse(canonical).success).toBe(true);
  });

  it('accepts travel_general text only when stage one independently agrees', () => {
    const raw = {
      tool: 'respond_conversationally',
      args: { mode: 'travel_general', message: 'Leave one flexible day.' },
    };
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: 'travel_general',
      }),
    ).toEqual(raw);
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: 'ambiguous',
      }),
    ).toEqual({
      tool: 'respond_conversationally',
      args: { mode: 'social', socialSubtype: 'repair' },
    });
  });

  it('rejects unrecognized tools before controller dispatch', () => {
    expect(canonicalizeAssistantTurnResponse({ tool: 'send_email', args: {} }, { conversationalOutcomesEnabled: true })).toBeNull();
  });
});
