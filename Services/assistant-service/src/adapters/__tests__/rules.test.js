import { describe, it, expect } from 'vitest';
import { RULES, RULE_NAMES, COLLECTION_RULES } from '../rules.js';
import { makeBundle, addRecord, addAggregate, daysAgo, daysAhead } from './bundleFixture.js';

// Every predicate gets the same three cases: fires, boundary, and no-evidence
// (which must return NOTHING rather than an uncited claim). The no-evidence case
// is the important one — an unsourced sentence is the single thing this design
// forbids, and it is enforced by the rule returning nothing.

const run = (name, bundle, decl, record, now = Date.now()) => {
  const def = RULES[name];
  return COLLECTION_RULES.has(name)
    ? def.run(bundle, decl, now)
    : def.run(bundle, decl, record, now);
};

describe('rule registry', () => {
  it('exposes the eleven documented predicates', () => {
    expect(RULE_NAMES).toHaveLength(11);
    expect(RULE_NAMES).toEqual(
      expect.arrayContaining([
        'staleForDays',
        'expiringWithin',
        'overdueBy',
        'stuckInStatus',
        'unassigned',
        'missingField',
        'ratioBelow',
        'thresholdExceeded',
        'zeroOrLowCount',
        'groupedCount',
        'groupedShare',
      ]),
    );
  });

  it('separates collection rules from per-record rules', () => {
    expect([...COLLECTION_RULES].sort()).toEqual(['groupedCount', 'groupedShare', 'zeroOrLowCount']);
  });
});

describe('staleForDays', () => {
  it('fires past the threshold and cites the field', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(30) }, ['id', 'updatedAt']);
    const [insight] = run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record);
    expect(insight).toBeTruthy();
    expect(insight.evidenceIds).toEqual([bundle.index.a.updatedAt]);
    expect(insight.fact).toEqual({ kind: 'date', value: record.updatedAt, evidenceId: bundle.index.a.updatedAt });
  });

  it('does not fire below the threshold', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(13) }, ['id', 'updatedAt']);
    expect(run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record)).toEqual([]);
  });

  it('returns nothing when the field has no evidence', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', updatedAt: daysAgo(30) }, ['id']);
    expect(run('staleForDays', bundle, { rule: 'staleForDays', field: 'updatedAt', days: 14 }, record)).toEqual([]);
  });
});

describe('expiringWithin', () => {
  it('fires for a date inside the window', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', validUntil: daysAhead(3) }, ['id', 'validUntil']);
    const [insight] = run('expiringWithin', bundle, { rule: 'expiringWithin', field: 'validUntil', days: 7 }, record);
    expect(insight.evidenceIds).toEqual([bundle.index.a.validUntil]);
  });

  it('does not fire for a date outside the window', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', validUntil: daysAhead(30) }, ['id', 'validUntil']);
    expect(run('expiringWithin', bundle, { rule: 'expiringWithin', field: 'validUntil', days: 7 }, record)).toEqual([]);
  });

  it('does not fire for an already-past date, which is overdueBy\'s job', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', validUntil: daysAgo(2) }, ['id', 'validUntil']);
    expect(run('expiringWithin', bundle, { rule: 'expiringWithin', field: 'validUntil', days: 7 }, record)).toEqual([]);
  });
});

describe('overdueBy', () => {
  const decl = {
    rule: 'overdueBy',
    field: 'dueDate',
    statusField: 'paymentStatus',
    statuses: ['unpaid', 'partial'],
    criticalAfterDays: 60,
  };

  it('fires past the due date while the status is open', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', dueDate: daysAgo(10), paymentStatus: 'unpaid' }, ['id', 'dueDate', 'paymentStatus']);
    const [insight] = run('overdueBy', bundle, decl, record);
    expect(insight.severity).toBe('warning');
  });

  it('escalates to critical past criticalAfterDays', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', dueDate: daysAgo(90), paymentStatus: 'unpaid' }, ['id', 'dueDate', 'paymentStatus']);
    expect(run('overdueBy', bundle, decl, record)[0].severity).toBe('critical');
  });

  it('does NOT fire once the invoice is settled, even though the date has passed', () => {
    // The status gate is the whole point: without it this fires on invoices that
    // were paid late, which reads as an outstanding problem that is not one.
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', dueDate: daysAgo(90), paymentStatus: 'paid' }, ['id', 'dueDate', 'paymentStatus']);
    expect(run('overdueBy', bundle, decl, record)).toEqual([]);
  });

  it('does not fire before the due date', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', dueDate: daysAhead(5), paymentStatus: 'unpaid' }, ['id', 'dueDate', 'paymentStatus']);
    expect(run('overdueBy', bundle, decl, record)).toEqual([]);
  });
});

describe('stuckInStatus', () => {
  it('fires for a matching status left unedited', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', status: 'draft', updatedAt: daysAgo(20) }, ['id', 'status', 'updatedAt']);
    const [insight] = run('stuckInStatus', bundle, { rule: 'stuckInStatus', statusField: 'status', statuses: ['draft'], days: 14 }, record);
    expect(insight.text).toMatch(/unedited/i);
  });

  it('does not fire for a status outside the set', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', status: 'sent', updatedAt: daysAgo(20) }, ['id', 'status', 'updatedAt']);
    expect(run('stuckInStatus', bundle, { rule: 'stuckInStatus', statusField: 'status', statuses: ['draft'], days: 14 }, record)).toEqual([]);
  });
});

describe('unassigned / missingField', () => {
  it('unassigned fires on a blank field and cites the record id', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', owner: null }, ['id']);
    const [insight] = run('unassigned', bundle, { rule: 'unassigned', field: 'owner' }, record);
    expect(insight.evidenceIds).toEqual([bundle.index.a.id]);
  });

  it('unassigned does not fire when the field is set', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', owner: 'rep-1' }, ['id', 'owner']);
    expect(run('unassigned', bundle, { rule: 'unassigned', field: 'owner' }, record)).toEqual([]);
  });

  it('missingField treats whitespace as missing', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', note: '   ' }, ['id', 'note']);
    expect(run('missingField', bundle, { rule: 'missingField', field: 'note' }, record)).toHaveLength(1);
  });
});

describe('ratioBelow', () => {
  it('fires under the threshold and reports a percentage fact', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', paidAmount: 20, totalAmount: 100 }, ['id', 'paidAmount', 'totalAmount']);
    const [insight] = run('ratioBelow', bundle, { rule: 'ratioBelow', numeratorField: 'paidAmount', denominatorField: 'totalAmount', threshold: 0.5 }, record);
    expect(insight.fact).toEqual({ kind: 'percentage', value: '20', evidenceId: bundle.index.a.paidAmount });
  });

  it('does not fire at the threshold', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', paidAmount: 50, totalAmount: 100 }, ['id', 'paidAmount', 'totalAmount']);
    expect(run('ratioBelow', bundle, { rule: 'ratioBelow', numeratorField: 'paidAmount', denominatorField: 'totalAmount', threshold: 0.5 }, record)).toEqual([]);
  });

  it('returns nothing when the denominator is zero rather than dividing by it', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', paidAmount: 0, totalAmount: 0 }, ['id', 'paidAmount', 'totalAmount']);
    expect(run('ratioBelow', bundle, { rule: 'ratioBelow', numeratorField: 'paidAmount', denominatorField: 'totalAmount', threshold: 0.5 }, record)).toEqual([]);
  });
});

describe('thresholdExceeded', () => {
  it('fires above the value', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', outstandingAmount: 12_000 }, ['id', 'outstandingAmount']);
    expect(run('thresholdExceeded', bundle, { rule: 'thresholdExceeded', field: 'outstandingAmount', threshold: 10_000 }, record)).toHaveLength(1);
  });

  it('does not fire at the value', () => {
    const bundle = makeBundle();
    const record = addRecord(bundle, { id: 'a', outstandingAmount: 10_000 }, ['id', 'outstandingAmount']);
    expect(run('thresholdExceeded', bundle, { rule: 'thresholdExceeded', field: 'outstandingAmount', threshold: 10_000 }, record)).toEqual([]);
  });
});

describe('zeroOrLowCount', () => {
  it('fires at or below the threshold, citing the aggregate', () => {
    const bundle = makeBundle();
    const id = addAggregate(bundle, 'invoices-past-due', 0);
    const [insight] = run('zeroOrLowCount', bundle, { rule: 'zeroOrLowCount', aggregate: 'invoices-past-due', threshold: 0 });
    expect(insight.evidenceIds).toEqual([id]);
  });

  it('does not fire above the threshold', () => {
    const bundle = makeBundle();
    addAggregate(bundle, 'invoices-past-due', 4);
    expect(run('zeroOrLowCount', bundle, { rule: 'zeroOrLowCount', aggregate: 'invoices-past-due', threshold: 0 })).toEqual([]);
  });
});

// ─── The relational predicates ───
// These exist because the Assignment found the original nine could not express
// any claim that related records to each other.

describe('groupedCount', () => {
  it('fires once for a key with enough members', () => {
    const bundle = makeBundle();
    for (const id of ['a', 'b', 'c']) {
      addRecord(bundle, { id, customerEmail: 'sam@acme.test' }, ['id', 'customerEmail']);
    }
    const insights = run('groupedCount', bundle, { rule: 'groupedCount', byKey: 'customerEmail', threshold: 3 });
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toContain('3');
  });

  it('does not fire below the threshold', () => {
    const bundle = makeBundle();
    for (const id of ['a', 'b']) {
      addRecord(bundle, { id, customerEmail: 'sam@acme.test' }, ['id', 'customerEmail']);
    }
    expect(run('groupedCount', bundle, { rule: 'groupedCount', byKey: 'customerEmail', threshold: 3 })).toEqual([]);
  });

  it('counts each key separately and never merges them', () => {
    const bundle = makeBundle();
    for (const id of ['a', 'b', 'c']) addRecord(bundle, { id, customerEmail: 'sam@acme.test' }, ['id', 'customerEmail']);
    for (const id of ['x', 'y', 'z']) addRecord(bundle, { id, customerEmail: 'kim@beta.test' }, ['id', 'customerEmail']);
    const insights = run('groupedCount', bundle, { rule: 'groupedCount', byKey: 'customerEmail', threshold: 3 });
    expect(insights).toHaveLength(2);
  });

  it('skips blank keys rather than grouping all of them together', () => {
    const bundle = makeBundle();
    for (const id of ['a', 'b', 'c', 'd']) addRecord(bundle, { id, customerEmail: null }, ['id']);
    expect(run('groupedCount', bundle, { rule: 'groupedCount', byKey: 'customerEmail', threshold: 3 })).toEqual([]);
  });
});

describe('groupedShare', () => {
  it('fires for a key holding enough of the summed value', () => {
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', customerEmail: 'sam@acme.test', outstandingAmount: 900 }, ['id', 'customerEmail', 'outstandingAmount']);
    addRecord(bundle, { id: 'b', customerEmail: 'kim@beta.test', outstandingAmount: 100 }, ['id', 'customerEmail', 'outstandingAmount']);
    const insights = run('groupedShare', bundle, { rule: 'groupedShare', byKey: 'customerEmail', sumField: 'outstandingAmount', threshold: 40 });
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toContain('90');
  });

  it('does not fire when no key reaches the share', () => {
    // Three equal holders are 33% each, so a 40% threshold clears nobody.
    const bundle = makeBundle();
    for (const [id, email] of [['a', 'sam@acme.test'], ['b', 'kim@beta.test'], ['c', 'jo@gam.test']]) {
      addRecord(bundle, { id, customerEmail: email, outstandingAmount: 100 }, ['id', 'customerEmail', 'outstandingAmount']);
    }
    expect(run('groupedShare', bundle, { rule: 'groupedShare', byKey: 'customerEmail', sumField: 'outstandingAmount', threshold: 40 })).toEqual([]);
  });

  it('fires for every key above the threshold, not just the largest', () => {
    // Two equal halves both clear 40%. Pinned deliberately: a share predicate
    // that only reported the top group would silently hide the second one.
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', customerEmail: 'sam@acme.test', outstandingAmount: 50 }, ['id', 'customerEmail', 'outstandingAmount']);
    addRecord(bundle, { id: 'b', customerEmail: 'kim@beta.test', outstandingAmount: 50 }, ['id', 'customerEmail', 'outstandingAmount']);
    expect(run('groupedShare', bundle, { rule: 'groupedShare', byKey: 'customerEmail', sumField: 'outstandingAmount', threshold: 40 })).toHaveLength(2);
  });

  it('returns nothing when the total is zero', () => {
    const bundle = makeBundle();
    addRecord(bundle, { id: 'a', customerEmail: 'sam@acme.test', outstandingAmount: 0 }, ['id', 'customerEmail', 'outstandingAmount']);
    expect(run('groupedShare', bundle, { rule: 'groupedShare', byKey: 'customerEmail', sumField: 'outstandingAmount', threshold: 40 })).toEqual([]);
  });
});
