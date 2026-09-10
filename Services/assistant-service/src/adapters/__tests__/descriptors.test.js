import { describe, it, expect } from 'vitest';
import { RULE_NAMES } from '../rules.js';
import { billingAdapter } from '../pages/billing.adapter.js';
import { overviewAdapter } from '../pages/overview.adapter.js';
import { analyticsAdapter } from '../pages/analytics.adapter.js';
import { packagesAdapter } from '../pages/packages.adapter.js';
import { flightsAdapter } from '../pages/flights.adapter.js';
import { hotelsAdapter } from '../pages/hotels.adapter.js';
import { usersAdapter } from '../pages/users.adapter.js';
import { careerAdapter } from '../pages/career.adapter.js';
import { settingsAdapter } from '../pages/settings.adapter.js';
import { leadsCollectionAdapter } from '../pages/leadsCollection.adapter.js';
import { leadsPageAdapter } from '../pages/leads.adapter.js';

// Structural contract tests across EVERY descriptor. Individual rule behaviour
// is covered by rules.test.js and the engine's failure paths by
// collectionEngine.test.js; this file answers a different question — is each
// declaration internally consistent?
//
// The checks that earn their place here are the reference ones. A rule naming a
// source that does not exist, or citing an aggregate nobody computes, is DEAD:
// it never fires, it fails silently, and neither TypeScript nor the engine
// complains. Two such rules were written by hand during this change and caught
// only by re-reading. This file makes that class of mistake impossible to merge.

const ENGINE_DESCRIPTORS = {
  billing: billingAdapter,
  overview: overviewAdapter,
  analytics: analyticsAdapter,
  packages: packagesAdapter,
  flights: flightsAdapter,
  hotels: hotelsAdapter,
  users: usersAdapter,
  career: careerAdapter,
  settings: settingsAdapter,
  leadsCollection: leadsCollectionAdapter,
};

const tracked = Object.entries(ENGINE_DESCRIPTORS);

describe('every descriptor is registered and well-formed', () => {
  it.each(tracked)('%s declares a key, a scope schema, and a label', (_name, adapter) => {
    const d = adapter.descriptor;
    expect(d.key).toBeTruthy();
    expect(d.scopeSchema).toBeTruthy();
    expect(typeof d.scopeLabel).toBe('function');
    expect(typeof adapter.parseScope).toBe('function');
  });

  it.each(tracked)('%s rejects unknown scope keys', (_name, adapter) => {
    // Every descriptor must be strict about its scope: an unrecognised filter
    // has to fail before a fetch, not be silently ignored.
    if (adapter.descriptor.key === 'analytics') {
      expect(() => adapter.parseScope({ nope: 1 })).toThrow();
      return;
    }
    expect(() => adapter.parseScope({ nope: 1 })).toThrow();
  });

  it.each(tracked)('%s has at least one source and one rule', (_name, adapter) => {
    expect(adapter.descriptor.sources.length).toBeGreaterThan(0);
    expect(adapter.descriptor.rules.length).toBeGreaterThan(0);
  });
});

describe('rules reference things that exist', () => {
  it.each(tracked)('%s names only declared sources', (_name, adapter) => {
    const declared = new Set(adapter.descriptor.sources.map((s) => s.name));
    const offenders = adapter.descriptor.rules
      .map((rule) => rule.source)
      .filter((source) => source !== undefined && !declared.has(source));
    expect(offenders).toEqual([]);
  });

  it.each(tracked)('%s names only known predicates (or supplies a function)', (_name, adapter) => {
    for (const rule of adapter.descriptor.rules) {
      if (typeof rule.run === 'function') continue;
      expect(RULE_NAMES).toContain(rule.rule);
    }
  });

  it.each(tracked)('%s declares every aggregate its rules cite', (_name, adapter) => {
    // A `zeroOrLowCount` rule pointing at an undeclared aggregate never fires.
    const declared = new Set((adapter.descriptor.aggregates ?? []).map((a) => a.name));
    const offenders = adapter.descriptor.rules
      .filter((rule) => rule.rule === 'zeroOrLowCount')
      .map((rule) => rule.aggregate)
      .filter((name) => !declared.has(name));
    expect(offenders).toEqual([]);
  });

  it.each(tracked)('%s only cites fields its own source allowlists', (_name, adapter) => {
    // A rule reading a field the source never projects gets `undefined` forever,
    // so the predicate silently never fires.
    const fieldsBySource = new Map(
      adapter.descriptor.sources.map((s) => [s.name, new Set(s.fields)]),
    );
    const fieldBearingRules = ['staleForDays', 'expiringWithin', 'overdueBy', 'unassigned', 'missingField', 'thresholdExceeded', 'ratioBelow'];
    const offenders = [];

    for (const rule of adapter.descriptor.rules) {
      if (!fieldBearingRules.includes(rule.rule) || !rule.source) continue;
      const allowed = fieldsBySource.get(rule.source);
      if (!allowed) continue;
      const fields = [rule.field, rule.statusField, rule.numeratorField, rule.denominatorField].filter(Boolean);
      for (const field of fields) {
        // `stuckInStatus` defaults to updatedAt/createdAt; both are allowlisted
        // wherever it is used, so no exemption is needed.
        if (!allowed.has(field)) offenders.push(`${rule.rule}.${field} not in ${rule.source}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each(tracked)('%s groups only by allowlisted keys', (_name, adapter) => {
    const fieldsBySource = new Map(
      adapter.descriptor.sources.map((s) => [s.name, new Set(s.fields)]),
    );
    const offenders = [];
    for (const rule of adapter.descriptor.rules) {
      if (!['groupedCount', 'groupedShare'].includes(rule.rule) || !rule.source) continue;
      const allowed = fieldsBySource.get(rule.source);
      if (!allowed) continue;
      const fields = [rule.byKey, rule.sumField].filter(Boolean);
      for (const field of fields) {
        if (!allowed.has(field)) offenders.push(`${rule.rule}.${field} not in ${rule.source}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('paging is declared wherever a page size could masquerade as a total', () => {
  // Collection endpoints that page by default MUST declare a total path, or a
  // tidy 200 over one page reads as a complete result and a count taken from it
  // is silently wrong. Singleton sources are complete by construction.
  it.each(tracked)('%s paginates every collection source it can prove complete', (_name, adapter) => {
    for (const source of adapter.descriptor.sources) {
      const shape = source.shape ?? 'collection';
      if (shape === 'singleton') continue;
      if (source.name === 'vacancies') {
        // /vacancies/admin/all takes no limit and reports no total; the row cap
        // is the only guard and nothing derives a count from it.
        expect(source.paging).toBeUndefined();
        continue;
      }
      expect(source.paging, `${adapter.descriptor.key}.${source.name} declares no paging`).toBeTruthy();
      expect(source.paging.totalPath).toBeTruthy();
    }
  });
});

describe('page key coverage', () => {
  it('covers all ten Management page keys across engine and record adapters', () => {
    const keys = new Set([...Object.values(ENGINE_DESCRIPTORS).map((a) => a.descriptor.key), leadsPageAdapter.key]);
    expect([...keys].sort()).toEqual([
      'analytics',
      'billing',
      'career',
      'flights',
      'hotels',
      'leads',
      'overview',
      'packages',
      'settings',
      'users',
    ]);
  });

  it('the leads entry serves both record and collection scope', () => {
    expect(leadsPageAdapter.parseScope({ leadId: 'lead-1' })).toEqual({ leadId: 'lead-1' });
    expect(leadsPageAdapter.parseScope({})).toEqual({});
    expect(() => leadsPageAdapter.parseScope({ leadId: '' })).toThrow();
    expect(() => leadsPageAdapter.parseScope({ nope: 1 })).toThrow();
  });
});
