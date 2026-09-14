import { describe, it, expect } from 'vitest';
import { resolveCallerIdentity, buildDynamicVariables } from '../callerIdentity.service.js';

const match = (over = {}) => ({
  leadId: 'lead-1',
  firstName: 'Nimal',
  statusClass: 'quote_sent',
  destination: 'Maldives',
  assignedToId: 'rep-1',
  ...over,
});

describe('resolveCallerIdentity', () => {
  it('returns outcome NONE when no lead matches the number', () => {
    expect(resolveCallerIdentity([]).outcome).toBe('NONE');
  });

  it('returns outcome NONE when matches is undefined', () => {
    expect(resolveCallerIdentity(undefined).outcome).toBe('NONE');
  });

  it('returns outcome MATCHED for exactly one lead', () => {
    expect(resolveCallerIdentity([match()]).outcome).toBe('MATCHED');
  });

  it('exposes the caller first name for a single match', () => {
    expect(resolveCallerIdentity([match()]).variables.caller_name).toBe('Nimal');
  });

  it('exposes the coarse status class for a single match', () => {
    expect(resolveCallerIdentity([match()]).variables.status_class).toBe('quote_sent');
  });

  it('carries the leadId out for a single match so the call can be bound to it', () => {
    expect(resolveCallerIdentity([match()]).leadId).toBe('lead-1');
  });

  it('returns outcome AMBIGUOUS when two leads share the number', () => {
    expect(resolveCallerIdentity([match(), match({ leadId: 'lead-2' })]).outcome).toBe('AMBIGUOUS');
  });

  it('withholds every caller name on an ambiguous match so no name leaks to the dialler', () => {
    const result = resolveCallerIdentity([match(), match({ leadId: 'lead-2', firstName: 'Kamal' })]);
    expect(result.variables.caller_name).toBe('');
  });

  it('reports no open lead on an ambiguous match', () => {
    const result = resolveCallerIdentity([match(), match({ leadId: 'lead-2' })]);
    expect(result.variables.has_open_lead).toBe('false');
  });

  it('binds no leadId on an ambiguous match', () => {
    expect(resolveCallerIdentity([match(), match({ leadId: 'lead-2' })]).leadId).toBeNull();
  });

  it('never exposes the leadId as a dynamic variable the agent could speak', () => {
    const { variables } = resolveCallerIdentity([match()]);
    expect(Object.values(variables)).not.toContain('lead-1');
  });

  it('emits an empty caller name rather than undefined when the lead has no name', () => {
    expect(resolveCallerIdentity([match({ firstName: null })]).variables.caller_name).toBe('');
  });

  it('falls back to a generic status class when the lead status is unmapped', () => {
    expect(resolveCallerIdentity([match({ statusClass: null })]).variables.status_class).toBe('in_progress');
  });
});

describe('buildDynamicVariables', () => {
  it('includes the number brand label', () => {
    const identity = resolveCallerIdentity([match()]);
    const vars = buildDynamicVariables({ identity, voiceNumber: { label: 'Lushware Travel' } });
    expect(vars.brand).toBe('Lushware Travel');
  });

  it('includes the per-number recording disclosure', () => {
    const identity = resolveCallerIdentity([]);
    const vars = buildDynamicVariables({ identity, voiceNumber: { disclosureText: 'This call is recorded.' } });
    expect(vars.disclosure).toBe('This call is recorded.');
  });

  it('falls back to a generic brand when the number has no label', () => {
    const identity = resolveCallerIdentity([]);
    expect(buildDynamicVariables({ identity, voiceNumber: {} }).brand).toBe('our travel team');
  });

  it('emits only the whitelisted variable keys', () => {
    const identity = resolveCallerIdentity([match()]);
    const vars = buildDynamicVariables({ identity, voiceNumber: { label: 'X' } });
    expect(Object.keys(vars).sort()).toEqual([
      'brand', 'caller_known', 'caller_name', 'destination', 'disclosure',
      'has_open_lead', 'open_trip_count', 'status_class',
    ]);
  });
});

// A repeat customer accumulates one lead per call, so "more than one match"
// is the normal state for a good customer — not a reason to forget them.
describe('a caller whose number matches several leads', () => {
  const lookup = (matches, over = {}) => ({ matches, samePerson: true, ...over });

  it('greets a repeat customer by name when every lead carries the same name', () => {
    const result = resolveCallerIdentity(lookup([
      match({ leadId: 'lead-3', recency: 'LIVE' }),
      match({ leadId: 'lead-2', recency: 'PAST' }),
      match({ leadId: 'lead-1', recency: 'PAST' }),
    ]));
    expect(result.variables.caller_name).toBe('Nimal');
  });

  it('binds the newest still-running trip, not an older finished one', () => {
    const result = resolveCallerIdentity(lookup([
      match({ leadId: 'lead-3', recency: 'PAST' }),
      match({ leadId: 'lead-2', recency: 'LIVE' }),
    ]));
    expect(result.leadId).toBe('lead-2');
  });

  it('counts only the still-running trips so the agent knows to confirm which one', () => {
    const result = resolveCallerIdentity(lookup([
      match({ leadId: 'lead-3', recency: 'LIVE' }),
      match({ leadId: 'lead-2', recency: 'LIVE' }),
      match({ leadId: 'lead-1', recency: 'PAST' }),
    ]));
    expect(result.variables.open_trip_count).toBe('2');
  });

  it('reports a single open trip as one so the agent does not ask which one', () => {
    const result = resolveCallerIdentity(lookup([
      match({ leadId: 'lead-2', recency: 'LIVE' }),
      match({ leadId: 'lead-1', recency: 'PAST' }),
    ]));
    expect(result.variables.open_trip_count).toBe('1');
  });

  it('names the bound trip destination so the agent can ask the caller to confirm it', () => {
    const result = resolveCallerIdentity(lookup([
      match({ leadId: 'lead-2', recency: 'LIVE', destination: 'Dubai' }),
      match({ leadId: 'lead-1', recency: 'LIVE', destination: 'Maldives' }),
    ]));
    expect(result.variables.destination).toBe('Dubai');
  });

  it('treats the number as shared when the leads carry two different names', () => {
    const result = resolveCallerIdentity({
      samePerson: false,
      matches: [match({ recency: 'LIVE' }), match({ leadId: 'lead-2', firstName: 'Kamal', recency: 'LIVE' })],
    });
    expect(result.outcome).toBe('AMBIGUOUS');
  });

  it('leaks no name when the number is shared by two different people', () => {
    const result = resolveCallerIdentity({
      samePerson: false,
      matches: [match({ recency: 'LIVE' }), match({ leadId: 'lead-2', firstName: 'Kamal', recency: 'LIVE' })],
    });
    expect(result.variables.caller_name).toBe('');
  });
});

describe('a returning customer whose every trip has already finished', () => {
  const finished = {
    samePerson: true,
    matches: [
      match({ leadId: 'lead-2', recency: 'PAST', statusClass: 'confirmed' }),
      match({ leadId: 'lead-1', recency: 'PAST', statusClass: 'confirmed' }),
    ],
  };

  it('returns outcome RETURNING rather than treating them as a stranger', () => {
    expect(resolveCallerIdentity(finished).outcome).toBe('RETURNING');
  });

  it('still greets them by name', () => {
    expect(resolveCallerIdentity(finished).variables.caller_name).toBe('Nimal');
  });

  it('binds no lead, so a holiday they already took can never be reopened', () => {
    expect(resolveCallerIdentity(finished).leadId).toBeNull();
  });

  it('reports no open lead so the agent starts a fresh enquiry', () => {
    expect(resolveCallerIdentity(finished).variables.has_open_lead).toBe('false');
  });

  it('speaks no destination from a finished trip', () => {
    expect(resolveCallerIdentity(finished).variables.destination).toBe('');
  });

  it('applies to a single finished trip too, not only to several', () => {
    const one = { samePerson: true, matches: [match({ recency: 'PAST' })] };
    expect(resolveCallerIdentity(one).outcome).toBe('RETURNING');
  });
});

describe('the lookup envelope', () => {
  it('still accepts a bare matches array from an older caller', () => {
    expect(resolveCallerIdentity([match()]).outcome).toBe('MATCHED');
  });

  it('treats a match with no recency field as a live trip', () => {
    const result = resolveCallerIdentity({ samePerson: true, matches: [match({ recency: undefined })] });
    expect(result.outcome).toBe('MATCHED');
  });

  it('returns outcome NONE for an envelope carrying no matches', () => {
    expect(resolveCallerIdentity({ count: 0, matches: [], samePerson: true }).outcome).toBe('NONE');
  });

  it('treats several matches as a shared number when samePerson is absent', () => {
    const result = resolveCallerIdentity({
      matches: [match({ recency: 'LIVE' }), match({ leadId: 'lead-2', recency: 'LIVE' })],
    });
    expect(result.outcome).toBe('AMBIGUOUS');
  });
});
