import { describe, it, expect } from 'vitest';
import { toStoredTranscript, toIntakeTranscript, MAX_INTAKE_MESSAGES } from '../transcript.service.js';

const turns = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'agent' : 'user', content: `turn ${i}` }));

describe('toStoredTranscript', () => {
  it('maps the agent role onto assistant', () => {
    expect(toStoredTranscript([{ role: 'agent', content: 'hello' }])[0].role).toBe('assistant');
  });

  it('keeps the user role as user', () => {
    expect(toStoredTranscript([{ role: 'user', content: 'hi' }])[0].role).toBe('user');
  });

  it('falls back to user for an unrecognised role', () => {
    expect(toStoredTranscript([{ role: 'system', content: 'x' }])[0].role).toBe('user');
  });

  it('numbers turns from zero', () => {
    expect(toStoredTranscript(turns(3)).map((t) => t.sequence)).toEqual([0, 1, 2]);
  });

  it('drops turns with blank content', () => {
    expect(toStoredTranscript([{ role: 'user', content: '   ' }, { role: 'user', content: 'real' }])).toHaveLength(1);
  });

  it('trims surrounding whitespace from content', () => {
    expect(toStoredTranscript([{ role: 'user', content: '  hi  ' }])[0].content).toBe('hi');
  });

  it('returns an empty array for no turns', () => {
    expect(toStoredTranscript([])).toEqual([]);
  });
});

describe('toIntakeTranscript', () => {
  const opts = { callId: 'call_abc', startedAt: new Date('2026-09-10T10:00:00.000Z') };

  it('keeps a short transcript whole', () => {
    const stored = toStoredTranscript(turns(5));
    expect(toIntakeTranscript(stored, opts)).toHaveLength(5);
  });

  it('caps a long call at the intake contract limit', () => {
    const stored = toStoredTranscript(turns(300));
    expect(toIntakeTranscript(stored, opts)).toHaveLength(MAX_INTAKE_MESSAGES);
  });

  it('keeps the LAST turns when capping, not the first', () => {
    const stored = toStoredTranscript(turns(300));
    const out = toIntakeTranscript(stored, opts);
    expect(out[out.length - 1].content).toBe('turn 299');
  });

  it('derives message ids from callId and sequence', () => {
    const stored = toStoredTranscript(turns(2));
    expect(toIntakeTranscript(stored, opts)[0].id).toBe('call_abc:0');
  });

  it('produces identical ids across two runs so a webhook retry dedupes', () => {
    const stored = toStoredTranscript(turns(4));
    expect(toIntakeTranscript(stored, opts)).toEqual(toIntakeTranscript(stored, opts));
  });

  it('truncates a single overlong turn to the contract char limit', () => {
    const stored = toStoredTranscript([{ role: 'user', content: 'x'.repeat(5000) }]);
    expect(toIntakeTranscript(stored, opts)[0].content).toHaveLength(2000);
  });

  it('emits ISO timestamps', () => {
    const stored = toStoredTranscript(turns(1));
    expect(toIntakeTranscript(stored, opts)[0].at).toBe('2026-09-10T10:00:00.000Z');
  });

  it('returns an empty array for an empty transcript', () => {
    expect(toIntakeTranscript([], opts)).toEqual([]);
  });
});
