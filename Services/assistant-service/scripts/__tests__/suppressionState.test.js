import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertSafeToWrite, backdatedInstant, scopeFingerprint } from '../suppression-state.mjs';

// The script reads process.env at call time, so the env is sandboxed per test
// rather than captured at import.
const ENV_KEYS = ['SYNTH_I_UNDERSTAND_SHARED_DB', 'E2E_I_UNDERSTAND_SHARED_DB', 'DATABASE_URL'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('scopeFingerprint', () => {
  it('matches the controller: JSON.stringify of the object, empty object for nothing', () => {
    expect(scopeFingerprint(undefined)).toBe('{}');
    expect(scopeFingerprint(null)).toBe('{}');
    expect(scopeFingerprint({})).toBe('{}');
    expect(scopeFingerprint({ leadId: 'abc' })).toBe('{"leadId":"abc"}');
  });

  it('is key-order sensitive, which is why the caller must build the scope the same way the client does', () => {
    expect(scopeFingerprint({ a: 1, b: 2 })).not.toBe(scopeFingerprint({ b: 2, a: 1 }));
  });
});

describe('backdatedInstant', () => {
  const now = new Date('2026-09-12T12:00:00.000Z');

  it('subtracts the requested number of hours, crossing a day boundary', () => {
    // 30h before 2026-09-12T12:00Z is the previous day at 06:00Z. The first
    // version of this expectation forgot the rollover and blamed the code.
    expect(backdatedInstant(30, now).toISOString()).toBe('2026-09-11T06:00:00.000Z');
    expect(backdatedInstant(1, now).toISOString()).toBe('2026-09-12T11:00:00.000Z');
    expect(backdatedInstant(72, now).toISOString()).toBe('2026-09-09T12:00:00.000Z');
  });

  it('treats 0 and "0" as now rather than rejecting them', () => {
    expect(backdatedInstant(0, now).toISOString()).toBe(now.toISOString());
    expect(backdatedInstant('0', now).toISOString()).toBe(now.toISOString());
  });

  it('accepts a numeric string because CLI args always arrive as strings', () => {
    expect(backdatedInstant('24', now).toISOString()).toBe('2026-09-11T12:00:00.000Z');
  });

  it('rejects a negative, missing or non-numeric age instead of writing a future timestamp', () => {
    expect(() => backdatedInstant(-1, now)).toThrow(/non-negative/);
    expect(() => backdatedInstant('soon', now)).toThrow(/non-negative/);
    expect(() => backdatedInstant(undefined, now)).toThrow(/non-negative/);
  });
});

describe('assertSafeToWrite', () => {
  it('refuses without the opt-in, naming the variable and why it matters', () => {
    const guard = assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@localhost:5432/db' });

    expect(guard.ok).toBe(false);
    expect(guard.reasons.join(' ')).toMatch(/SYNTH_I_UNDERSTAND_SHARED_DB/);
    expect(guard.reasons.join(' ')).toMatch(/shared dev database/);
  });

  it('accepts either opt-in name, because the e2e suite sets the E2E_ one', () => {
    process.env.E2E_I_UNDERSTAND_SHARED_DB = 'true';
    expect(assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@localhost:5432/db' }).ok).toBe(true);

    delete process.env.E2E_I_UNDERSTAND_SHARED_DB;
    process.env.SYNTH_I_UNDERSTAND_SHARED_DB = 'true';
    expect(assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@localhost:5432/db' }).ok).toBe(true);
  });

  it('does not accept a truthy-but-not-true value', () => {
    process.env.SYNTH_I_UNDERSTAND_SHARED_DB = 'yes';
    expect(assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@localhost:5432/db' }).ok).toBe(false);
  });

  it('refuses a production-looking DSN even with the opt-in set', () => {
    process.env.SYNTH_I_UNDERSTAND_SHARED_DB = 'true';
    const guard = assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@db.production.internal:5432/app' });

    expect(guard.ok).toBe(false);
    expect(guard.reasons.join(' ')).toMatch(/production/);
  });

  it('refuses when DATABASE_URL is missing entirely', () => {
    process.env.SYNTH_I_UNDERSTAND_SHARED_DB = 'true';
    const guard = assertSafeToWrite({ databaseUrl: '' });

    expect(guard.ok).toBe(false);
    expect(guard.reasons.join(' ')).toMatch(/DATABASE_URL is not set/);
  });

  it('collects every reason at once rather than making the operator fix them one by one', () => {
    const guard = assertSafeToWrite({ databaseUrl: 'postgresql://user:pw@db.production.internal:5432/app' });

    expect(guard.reasons.length).toBe(2);
  });
});
