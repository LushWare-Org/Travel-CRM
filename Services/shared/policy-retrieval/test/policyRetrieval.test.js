import { describe, it, expect } from 'vitest';
import { retrieveSnippets } from '../src/index.js';

const documents = [
  {
    id: 'doc-1',
    title: 'Refund Policy',
    body: 'Cancellations made more than 30 days before departure receive a full refund.\n\nCancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.',
  },
  {
    id: 'doc-2',
    title: 'Baggage Policy',
    body: 'Each traveler may bring one checked bag up to 23kg and one carry-on.',
  },
];

describe('retrieveSnippets', () => {
  it('returns the section that matches the question keywords', () => {
    const result = retrieveSnippets(documents, 'What is your refund policy if I cancel?');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].docId).toBe('doc-1');
    expect(result[0].title).toBe('Refund Policy');
  });

  it('returns [] when the question has no meaningful words', () => {
    expect(retrieveSnippets(documents, 'ok')).toEqual([]);
    expect(retrieveSnippets(documents, '')).toEqual([]);
  });

  it('returns [] when nothing in any document matches', () => {
    expect(retrieveSnippets(documents, 'What time does the airport shuttle leave?')).toEqual([]);
  });

  it('never returns more than maxSnippets', () => {
    const manyDocs = [
      { id: 'd1', title: 'A', body: 'Refund policy section one about cancellations.' },
      { id: 'd2', title: 'B', body: 'Refund policy section two about cancellations.' },
      { id: 'd3', title: 'C', body: 'Refund policy section three about cancellations.' },
    ];
    const result = retrieveSnippets(manyDocs, 'refund cancellation policy', { maxSnippets: 2 });
    expect(result).toHaveLength(2);
  });

  it('returns the verbatim stored section text as the quote, never a paraphrase', () => {
    const result = retrieveSnippets(documents, 'Is my trip refundable if I cancel within 30 days?');
    expect(result[0].quote).toBe('Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.');
  });

  it('handles documents with no body gracefully', () => {
    expect(retrieveSnippets([{ id: 'd1', title: 'Empty', body: '' }], 'refund policy')).toEqual([]);
  });
});
