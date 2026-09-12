import { describe, it, expect } from 'vitest';
import { RULES, COLLECTION_RULES } from '../rules.js';
import { makeBundle, addRecord, addAggregate, daysAgo } from './bundleFixture.js';

// Rules put numbers in their prose, and the validator that guards model output
// checks every numeric token against the claim's facts. A number that appears
// nowhere in the data — "62 days", "12 leads", "43%" — therefore has to be
// DECLARED as a derivation, or the sentence is deleted and the operator sees
// nothing. These tests pin that contract rule by rule.

const run = (name, bundle, decl, record, now = Date.now()) => {
  const def = RULES[name];
  return COLLECTION_RULES.has(name) ? def.run(bundle, decl, now) : def.run(bundle, decl, record, now);
};

const findFact = (insight, kind) => (insight.facts ?? []).find((fact) => fact.kind === kind);

describe('a duration rule declares the number it states', () => {
  it('emits both the date it measured from and the day count it printed', () => {
    const bundle = makeBundle();
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(62, now) }, ['id', 'updatedAt']);
    const [insight] = run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record, now);

    expect(insight.text).toContain('62');
    expect(insight.fact).toMatchObject({ kind: 'date' });

    const duration = findFact(insight, 'duration');
    expect(duration).toMatchObject({ value: '62', unit: 'days', derivation: 'elapsed-since' });
    expect(duration.evidenceId).toBe(bundle.index.a.updatedAt);
  });

  it('keeps the primary fact singular for the existing wire shape and the client', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(30) }, ['id', 'updatedAt']);
    const [insight] = run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record);

    expect(insight.fact).toBeTruthy();
    expect(Array.isArray(insight.facts)).toBe(true);
  });

  it('declares a duration for a past-due record too', () => {
    const bundle = makeBundle();
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    const record = addRecord(bundle, { id: 'a', dueDate: daysAgo(70, now), status: 'sent' }, ['id', 'dueDate']);
    const [insight] = run('overdueBy', bundle, { rule: 'overdueBy', field: 'dueDate', statusField: 'status', statuses: ['sent'] }, record, now);

    expect(findFact(insight, 'duration')).toMatchObject({ value: '70', unit: 'days', derivation: 'elapsed-since' });
  });

  it('declares a duration for an unedited record', () => {
    const bundle = makeBundle();
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(9, now), status: 'NEW' }, ['id', 'updatedAt']);
    const [insight] = run('stuckInStatus', bundle, { rule: 'stuckInStatus', statusField: 'status', statuses: ['NEW'], dateField: 'updatedAt', days: 2 }, record, now);

    expect(findFact(insight, 'duration')).toMatchObject({ value: '9', unit: 'days' });
  });
});

describe('a grouping rule declares the count it printed', () => {
  it('emits the member count as data, because it exists nowhere in the records', () => {
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', destination: 'Bali' }, ['id', 'destination']);
    addRecord(bundle, { id: 'b', destination: 'Bali' }, ['id', 'destination']);
    addRecord(bundle, { id: 'c', destination: 'Bali' }, ['id', 'destination']);

    const [insight] = run(
      'groupedCount',
      bundle,
      { rule: 'groupedCount', source: 'leads', byKey: 'destination', threshold: 3, text: '{count} leads want {byKey}.' },
      null,
    );

    expect(insight.text).toContain('3');
    expect(findFact(insight, 'count')).toMatchObject({ value: '3', derivation: 'grouped-by' });
  });

  it('emits a percentage as a ratio derivation', () => {
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', customer: 'Acme', amount: 75 }, ['id', 'customer', 'amount']);
    addRecord(bundle, { id: 'b', customer: 'Other', amount: 25 }, ['id', 'customer', 'amount']);

    const [insight] = run(
      'groupedShare',
      bundle,
      { rule: 'groupedShare', source: 'invoices', byKey: 'customer', sumField: 'amount', threshold: 50 },
      null,
    );

    expect(findFact(insight, 'percentage')).toMatchObject({ value: '75', unit: 'percent', derivation: 'ratio-of' });
  });
});

describe('a rule that names a threshold declares the constant too', () => {
  it('emits the field value and the rule constant as separate facts', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', budget: 9000 }, ['id', 'budget']);
    const [insight] = run('thresholdExceeded', bundle, { rule: 'thresholdExceeded', field: 'budget', threshold: 5000, factKind: 'amount' }, record);

    expect(insight.text).toContain('5000');
    const facts = insight.facts ?? [];
    expect(facts.map((f) => f.value).sort()).toEqual(['5000', '9000']);
    expect(facts.find((f) => f.value === '5000')).toMatchObject({ derivation: 'descriptor-constant' });
  });

  it('does the same for an aggregate rule that states its threshold', () => {
    const bundle = makeBundle();
    addAggregate(bundle, 'overdueCount', 0);
    const [insight] = run('zeroOrLowCount', bundle, { rule: 'zeroOrLowCount', aggregate: 'overdueCount', threshold: 0 }, null);

    const facts = insight.facts ?? [];
    expect(facts).toHaveLength(2);
    expect(facts.find((f) => f.derivation === 'descriptor-constant')).toMatchObject({ value: '0' });
  });
});

describe('every rule declares what its insight is about', () => {
  it('attaches a record ref to a per-record rule', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(30) }, ['id', 'updatedAt']);
    const [insight] = run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record);

    expect(insight.entityRef).toEqual({ kind: 'record', id: 'a' });
  });

  it('attaches a group ref to a grouping rule, because no single record is what it is about', () => {
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', destination: 'Bali' }, ['id', 'destination']);
    addRecord(bundle, { id: 'b', destination: 'Bali' }, ['id', 'destination']);
    addRecord(bundle, { id: 'c', destination: 'Bali' }, ['id', 'destination']);

    const [insight] = run('groupedCount', bundle, { rule: 'groupedCount', source: 'leads', byKey: 'destination', threshold: 3 }, null);

    expect(insight.entityRef).toEqual({ kind: 'group', id: 'leads:destination:Bali' });
  });

  it('attaches a collection ref to an aggregate-only rule', () => {
    const bundle = makeBundle();
    addAggregate(bundle, 'overdueCount', 0);
    const [insight] = run('zeroOrLowCount', bundle, { rule: 'zeroOrLowCount', aggregate: 'overdueCount', threshold: 0 }, null);

    expect(insight.entityRef).toEqual({ kind: 'collection', id: 'page:overdueCount' });
  });

  it('gives every cited fact an evidence id the insight already cites', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', budget: 9000 }, ['id', 'budget']);
    const [insight] = run('thresholdExceeded', bundle, { rule: 'thresholdExceeded', field: 'budget', threshold: 5000 }, record);

    for (const fact of insight.facts ?? []) {
      expect(insight.evidenceIds).toContain(fact.evidenceId);
    }
  });
});
