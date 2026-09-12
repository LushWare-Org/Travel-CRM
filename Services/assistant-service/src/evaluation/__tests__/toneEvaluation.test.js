import { describe, it, expect } from 'vitest';
import { judgeTone, summarizeToneEvaluation } from '../toneEvaluation.js';

const clean = (prose) => judgeTone({ prose });

const expectFailure = (prose, id) => {
  const judged = clean(prose);
  expect(judged.failures.map((f) => f.id)).toContain(id);
  return judged;
};

describe('judgeTone — prose that should pass', () => {
  it('accepts a short answer with grounded counts in the sentence', () => {
    const judged = clean(
      'Bali leads demand with 12 open leads, ahead of Dubai at 8. Goa is your biggest single cluster at 31, and worth a look.',
    );

    expect(judged.passed).toBe(true);
    expect(judged.failures).toEqual([]);
    expect(judged.signals).toEqual([]);
  });

  it('accepts money phrasing with an amount and a recommendation', () => {
    expect(clean('Three invoices are past 60 days and two are over EUR 5,000. Start with the older one.').passed).toBe(
      true,
    );
  });

  it('accepts a two-word quiet state', () => {
    expect(clean('Nothing needs you today.').passed).toBe(true);
  });

  it('ignores the structured field entirely, however machine-shaped it is', () => {
    const judged = judgeTone({
      prose: 'Nothing needs you today.',
      structured: { tool: 'listLeads', result: [{ id: 'LEAD-8F21', count: 12 }] },
    });

    expect(judged.passed).toBe(true);
    expect(judged.failures).toEqual([]);
  });
});

describe('judgeTone — machine-shaped output must fail', () => {
  it('fails a serialized object in prose', () => {
    expectFailure('{"tool": "listLeads", "result": [{"id": "abc"}]}', 'raw-json');
  });

  it('fails a leaked evidence id or field path', () => {
    expectFailure('I checked tool:listLeads:1 and it shows 12 rows.', 'evidence-id');
    expectFailure('The claim cites evidenceIds from this page.', 'evidence-id');
  });

  it('fails a raw record id', () => {
    expectFailure('LEAD-8F21 is unclaimed and pending verification.', 'record-id');
  });

  it('fails canned query-report phrasing', () => {
    expectFailure('I found 3 results matching your query.', 'canned-search-phrase');
  });

  it('fails assistant boilerplate openers', () => {
    expectFailure('Based on the data provided, Bali has 12 leads.', 'boilerplate-opener');
    expectFailure('I have analyzed the invoices on this page.', 'boilerplate-opener');
  });

  it('fails restating the question before answering', () => {
    expectFailure('You asked about destinations. Bali has 12 leads.', 'question-restatement');
  });

  it('fails tabular or fenced structure inside a sentence', () => {
    expectFailure('Summary: | destination | count |', 'table-in-prose');
    expectFailure('- destination: Bali', 'table-in-prose');
  });

  it('fails filler and apology loops', () => {
    expectFailure('It is important to note that two invoices are overdue.', 'filler');
    expectFailure('I apologize for the confusion about the counts.', 'apology-loop');
  });
});

describe('judgeTone — structural limits', () => {
  it('fails prose over the word limit', () => {
    expectFailure(`${Array(80).fill('word').join(' ')}.`, 'too-long');
  });

  it('fails prose over the sentence limit', () => {
    expectFailure('One thing. Two things. Three things. Four things.', 'too-many-sentences');
  });

  it('fails prose over the character limit', () => {
    expectFailure(`${'a'.repeat(430)}.`, 'too-many-chars');
  });

  it('fails empty prose rather than passing it silently', () => {
    expect(clean('').passed).toBe(false);
    expect(clean('').failures[0].id).toBe('empty-prose');
    expect(clean(undefined).passed).toBe(false);
  });
});

describe('judgeTone — soft signals never fail a turn', () => {
  it('records the missing second person as a signal, not a failure', () => {
    const judged = clean('Bali leads demand with 12 open leads.');

    expect(judged.passed).toBe(true);
    expect(judged.signals.map((s) => s.id)).toContain('second-person');
  });

  it('records an acknowledgement opener as a signal, not a failure', () => {
    const judged = clean('Sure, Bali has the most leads at 12.');

    expect(judged.passed).toBe(true);
    expect(judged.signals.map((s) => s.id)).toContain('leads-with-substance');
  });
});

describe('summarizeToneEvaluation', () => {
  it('reports pass rate, failures by rule and weak signals', () => {
    const results = [
      { judged: clean('Bali leads with 12 open leads, ahead of Dubai at 8.') },
      { judged: clean('{"tool": "listLeads"}') },
      { judged: clean('I found 4 results matching your query.') },
      { judged: clean('Nothing needs you today.') },
    ];

    const summary = summarizeToneEvaluation(results);

    expect(summary.total).toBe(4);
    expect(summary.passed).toBe(2);
    expect(summary.passRate).toBe(0.5);
    expect(summary.failuresByRule.map(([id]) => id)).toContain('raw-json');
    expect(summary.failuresByRule.map(([id]) => id)).toContain('canned-search-phrase');
    expect(summary.version).toBe('tone.v1');
  });

  it('handles an empty fixture set without dividing by zero', () => {
    const summary = summarizeToneEvaluation([]);

    expect(summary.passRate).toBe(0);
    expect(summary.failuresByRule).toEqual([]);
  });
});
