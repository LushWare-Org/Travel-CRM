import { describe, it, expect } from 'vitest';
import { GROUNDING_RULES, GROUNDING_VERSION, groundingBlock } from '../prompts/groundingRules.js';
import {
  buildManagementAnswerPrompt,
  buildManagementFinalAnswerPrompt,
  MANAGEMENT_ANSWER_VERSION,
} from '../prompts/managementAnswer.v2.js';
import { buildManagementBriefingPrompt, MANAGEMENT_BRIEFING_VERSION } from '../prompts/managementBriefing.v2.js';

// The prompt and the validator are two halves of one policy, and the failure mode
// when they disagree is silent: the model self-censors while the gate is willing
// to accept, or the gate rejects what the prompt invited. These tests pin the
// wording that has to move together.

const answerPrompt = (overrides = {}) =>
  buildManagementAnswerPrompt({ scopeLabel: 'Leads', question: 'q', evidence: [], ...overrides });

const briefingPrompt = () =>
  buildManagementBriefingPrompt({
    bundle: { evidence: [] },
    scopeLabel: 'Leads',
    sinceBoundary: '2026-09-01T00:00:00.000Z',
    guidanceEnabled: false,
  });

describe('the grounding rules live in one place', () => {
  it('is used verbatim by both prompts, so a change cannot land on one surface only', () => {
    const block = groundingBlock();

    expect(answerPrompt()).toContain(block);
    expect(answerPrompt({ toolDescriptions: [{ name: 'listLeads', description: 'd' }] })).toContain(block);
    expect(briefingPrompt()).toContain(block);
  });

  it('stamps a version, so a prompt change is attributable', () => {
    expect(GROUNDING_VERSION).toBe('grounding.v2');
    expect(MANAGEMENT_ANSWER_VERSION).toBe('managementAnswer.v2');
    expect(MANAGEMENT_BRIEFING_VERSION).toBe('managementBriefing.v2');
  });
});

describe('the number rule as stated to the model', () => {
  it('permits a number when the claim also emits it as a typed fact', () => {
    expect(GROUNDING_RULES.join('\n')).toMatch(/A number MAY appear in `text`/);
  });

  it('no longer tells the model that prose must be qualitative only', () => {
    // The old v1 line. Its presence here would undo the numeric work: the model
    // would keep avoiding the numbers the validator now accepts.
    for (const prompt of [answerPrompt(), briefingPrompt()]) {
      expect(prompt).not.toMatch(/qualitative prose only/);
      expect(prompt).not.toMatch(/If a value appears in `text`, the claim is discarded/);
    }
  });

  it('still forbids inventing a value', () => {
    for (const prompt of [answerPrompt(), briefingPrompt()]) {
      expect(prompt).toMatch(/Never invent a number/);
    }
  });

  it('explains how to declare a computed value', () => {
    const block = groundingBlock();

    expect(block).toMatch(/derivation/);
    expect(block).toMatch(/grouped-by/);
    expect(block).toMatch(/elapsed-since/);
    expect(block).toMatch(/ratio-of/);
  });
});

describe('the structure boundary', () => {
  it('sends counts and ids to the structured fields rather than into prose', () => {
    for (const prompt of [answerPrompt(), briefingPrompt()]) {
      expect(prompt).toMatch(/WHERE STRUCTURE GOES/);
      expect(prompt).toMatch(/Never put a raw record id/);
    }
  });
});

describe('ask mode is told to answer a counting question', () => {
  it('points a counting question at the tool that carries the subject, rather than at hand-counting', () => {
    const withTool = answerPrompt({ toolDescriptions: [{ name: 'listLeads', description: 'list leads' }] });

    expect(withTool).toMatch(/COUNT, a RANKING or a GROUPING/);
    expect(withTool).toMatch(/use the tool that carries the subject/);
    // The analytics tools return figures the service already computed, so the
    // model is not invited to count a capped list itself.
    expect(withTool).toMatch(/rather than counting a capped list/);
    expect(withTool).toMatch(/do not return an empty claim list/i);
  });

  it('tells the model the scope does not bound what it may read', () => {
    const prompt = answerPrompt({ toolDescriptions: [{ name: 'getPackagePerformance', description: 'd' }] });

    // The reach change: the page decides what is volunteered, not what is askable.
    expect(prompt).toMatch(/it does not bound what you may read/);
    expect(prompt).toMatch(/even when that domain is not this page/);
    // Still forbidden to relabel one entity as another — that failure is about
    // naming, not about reach, and survives the widening.
    expect(prompt).toMatch(/never answer about a different entity/i);
  });

  it('sends the model to the precomputed groups when the evidence carries them', () => {
    const prompt = answerPrompt({
      toolDescriptions: [{ name: 'listLeads', description: 'd' }],
      evidence: [
        { id: 'leads:aggregate:leads:destination:Goa:value', type: 'computed', fieldPaths: ['count'], value: 14 },
      ],
    });

    expect(prompt).toMatch(/PRE-COMPUTED GROUPS/);
    expect(prompt).toMatch(/Do NOT call a tool to re-count or re-group/);
    // This is the line that broke it live: the server had the answer in the
    // evidence, and the prompt told the model not to use it — so it re-gathered
    // by hand, failed four times, and returned nothing.
    expect(prompt).not.toMatch(/do not answer such a question from the initial evidence alone/);
  });

  it('points the model at a tool, not at its own count, when no groups were precomputed', () => {
    const prompt = answerPrompt({
      toolDescriptions: [{ name: 'listLeads', description: 'd' }],
      evidence: [
        { id: 'leads:record:lead-1:destination', type: 'record', fieldPaths: ['destination'], value: 'Goa' },
      ],
    });

    // Without precomputed groups the tool path still answers, but by reading the
    // domain's own figures rather than by counting a capped list the model read.
    expect(prompt).toMatch(/use the tool that carries the subject/);
    expect(prompt).not.toMatch(/PRE-COMPUTED GROUPS/);
  });

  it('spots a group by the id shape the server builds, not by a flag the caller must pass', () => {
    // The distinction has to survive the prompt builder being called from
    // anywhere, so it is derived from the evidence itself.
    const withMarker = answerPrompt({
      toolDescriptions: [{ name: 'listLeads', description: 'd' }],
      evidence: [{ id: 'x:aggregate:y:z:value' }],
    });
    const disguised = answerPrompt({
      toolDescriptions: [{ name: 'listLeads', description: 'd' }],
      evidence: [{ id: 'x:aggregatey:z:value' }],
    });

    expect(withMarker).toMatch(/PRE-COMPUTED GROUPS/);
    expect(disguised).not.toMatch(/PRE-COMPUTED GROUPS/);
  });

  it('keeps the no-tools path honest about its limits', () => {
    expect(answerPrompt()).toMatch(/No tools are available for this scope/);
  });

  it('tells the model a tool-derived claim may cite nothing, on every answer path', () => {
    const toolPrompt = answerPrompt({ toolDescriptions: [{ name: 'getPackagePerformance', description: 'd' }] });
    const singleShot = answerPrompt();
    const forced = buildManagementFinalAnswerPrompt({
      scopeLabel: 'Packages',
      question: 'q',
      evidence: [],
      history: [],
    });

    for (const prompt of [toolPrompt, singleShot, forced]) {
      expect(prompt).toMatch(/may leave `evidenceIds` empty/);
    }
    // The briefing has no computed results to reason about — every one of its
    // claims cites a rendered field — so the exception must not reach it.
    expect(briefingPrompt()).not.toMatch(/may leave `evidenceIds` empty/);
  });

  it('forbids answering about one entity under a different name, on every path', () => {
    // Grounding cannot catch a substitution: the numbers stay true and citable
    // while the subject is wrong. It has to be forbidden in the prompt, which is
    // why this asserts all three paths and not just the one that failed live.
    const paths = [
      answerPrompt({ toolDescriptions: [{ name: 'listLeads', description: 'd' }] }),
      answerPrompt({ toolDescriptions: [{ name: 'listLeads', description: 'd' }], history: [{ tool: 'listLeads', result: { data: [] } }] }),
      answerPrompt(),
    ];

    for (const prompt of paths) {
      expect(prompt).toMatch(/never answer about a different entity/i);
    }
    // The three surfaces are distinct code paths, so the text must appear once in
    // each rather than being assumed to be shared.
    expect(answerPrompt({ toolDescriptions: [{ name: 'listLeads', description: 'd' }] })).toContain('a list of leads is not a catalogue');
  });
});

describe('briefing is told criticals come first', () => {
  it('names the irreversible cases explicitly', () => {
    const prompt = briefingPrompt();

    expect(prompt).toMatch(/Criticals are never optional/);
    expect(prompt).toMatch(/breached deadline or money at risk/);
  });

  it('bounds the actionable sections so the briefing is not a list', () => {
    expect(briefingPrompt()).toMatch(/at most three items/);
  });
});
