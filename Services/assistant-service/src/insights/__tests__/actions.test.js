import { describe, it, expect } from 'vitest';
import {
  ACTION_KINDS,
  ACTION_STATES,
  actionDescriptorSchema,
  actionIdempotencyKey,
  applyAction,
  buildAuditRecord,
  buildPreview,
  validateActionDescriptor,
} from '../actions.js';

const navigate = (overrides = {}) => ({
  kind: 'navigate',
  verb: 'review-demand',
  target: { kind: 'group', id: 'leads:destination:Bali' },
  params: {},
  ...overrides,
});

const caller = { actorId: 'user-1', pageKey: 'leads', scopeFingerprint: '{}' };

describe('validateActionDescriptor', () => {
  it('accepts a well-formed descriptor and defaults params to an empty object', () => {
    const parsed = validateActionDescriptor({
      kind: 'navigate',
      verb: 'review-demand',
      target: { kind: 'group', id: 'leads:destination:Bali' },
    });

    expect(parsed.params).toEqual({});
    expect(parsed.target).toEqual({ kind: 'group', id: 'leads:destination:Bali' });
  });

  it('returns err 400 naming the field when the kind is unknown', () => {
    expect(() => validateActionDescriptor(navigate({ kind: 'send_invoice' }))).toThrowError(
      /Invalid action descriptor.*kind/,
    );
  });

  it('returns err 400 when the target kind is not one of record, group or collection', () => {
    expect(() =>
      validateActionDescriptor(navigate({ target: { kind: 'customer', id: 'c-1' } })),
    ).toThrowError(/target/);
  });

  it('returns err 400 when the target id is empty', () => {
    expect(() => validateActionDescriptor(navigate({ target: { kind: 'record', id: '' } }))).toThrowError(
      /target/,
    );
  });

  it('rejects unknown top-level keys rather than ignoring them', () => {
    expect(() => validateActionDescriptor(navigate({ execute: true }))).toThrowError(
      /Invalid action descriptor/,
    );
  });

  it('rejects a null descriptor', () => {
    expect(() => validateActionDescriptor(null)).toThrowError(/Invalid action descriptor/);
  });

  it('exposes a closed kind list and a closed state list', () => {
    expect(ACTION_KINDS).toContain('navigate');
    expect(ACTION_KINDS).not.toContain('send_invoice');
    expect(ACTION_STATES).toEqual(['proposed', 'previewed', 'confirmed', 'applied', 'cancelled']);
  });
});

describe('actionIdempotencyKey', () => {
  it('is stable for identical inputs', () => {
    const a = actionIdempotencyKey({ ...caller, descriptor: navigate() });
    const b = actionIdempotencyKey({ ...caller, descriptor: navigate() });

    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it('differs between two operators acting on the same target', () => {
    const first = actionIdempotencyKey({ ...caller, descriptor: navigate() });
    const second = actionIdempotencyKey({
      actorId: 'user-2',
      pageKey: 'leads',
      scopeFingerprint: '{}',
      descriptor: navigate(),
    });

    expect(second).not.toBe(first);
  });

  it('differs when the target or the verb changes', () => {
    const base = actionIdempotencyKey({ ...caller, descriptor: navigate() });
    const otherTarget = actionIdempotencyKey({
      ...caller,
      descriptor: navigate({ target: { kind: 'group', id: 'leads:destination:Dubai' } }),
    });
    const otherVerb = actionIdempotencyKey({ ...caller, descriptor: navigate({ verb: 'call' }) });

    expect(otherTarget).not.toBe(base);
    expect(otherVerb).not.toBe(base);
  });
});

describe('buildPreview', () => {
  it('produces byte-identical output for repeated calls with the same inputs', () => {
    const descriptor = validateActionDescriptor(navigate());

    expect(buildPreview({ ...caller, descriptor })).toEqual(buildPreview({ ...caller, descriptor }));
  });

  it('states what would happen, marks navigation as implemented and needing no confirmation', () => {
    const preview = buildPreview({ ...caller, descriptor: validateActionDescriptor(navigate()) });

    expect(preview.summary).toBe('Go to group leads:destination:Bali');
    expect(preview.implemented).toBe(true);
    expect(preview.requiresConfirmation).toBe(false);
    expect(preview.state).toBe('proposed');
  });

  it('marks a kind with no executor as not implemented and says so in the summary', () => {
    const preview = buildPreview({
      ...caller,
      descriptor: validateActionDescriptor({
        kind: 'assign',
        verb: 'assign-owner',
        target: { kind: 'record', id: 'lead-1' },
        params: { assignedToId: 'user-2' },
      }),
    });

    expect(preview.implemented).toBe(false);
    expect(preview.summary).toMatch(/not implemented yet/);
  });

  it('requires confirmation for a mutating kind even when its executor does not exist yet', () => {
    const preview = buildPreview({
      ...caller,
      descriptor: validateActionDescriptor({
        kind: 'record_payment',
        verb: 'record-payment',
        target: { kind: 'record', id: 'inv-1' },
      }),
    });

    expect(preview.implemented).toBe(false);
    expect(preview.requiresConfirmation).toBe(true);
  });

  it('never requires confirmation for navigation', () => {
    const preview = buildPreview({ ...caller, descriptor: validateActionDescriptor(navigate()) });

    expect(preview.requiresConfirmation).toBe(false);
  });
});

describe('applyAction', () => {
  it('defaults to a dry run that reports applied false and returns the preview unchanged', () => {
    const result = applyAction({ ...caller, descriptor: navigate() });

    expect(result.applied).toBe(false);
    expect(result.summary).toBe('Go to group leads:destination:Bali');
  });

  it('returns err 400 for a malformed descriptor instead of a partial object', () => {
    expect(() => applyAction({ ...caller, descriptor: { kind: 'navigate' } })).toThrowError(
      /Invalid action descriptor/,
    );
  });

  it('returns err 501 naming the kind when a non-dry run targets a kind with no executor', () => {
    expect(() =>
      applyAction({
        ...caller,
        dryRun: false,
        descriptor: { kind: 'assign', verb: 'assign-owner', target: { kind: 'record', id: 'lead-1' } },
      }),
    ).toThrowError(/Action kind 'assign' has no executor/);
  });

  it('returns err 501 for a non-dry run even when the kind does have an executor', () => {
    expect(() => applyAction({ ...caller, dryRun: false, descriptor: navigate() })).toThrowError(
      /not enabled in this release/,
    );
  });
});

describe('buildAuditRecord', () => {
  it('carries the stable shape and reuses the idempotency key as the action id', () => {
    const descriptor = validateActionDescriptor(navigate());
    const record = buildAuditRecord({ ...caller, descriptor, decision: 'previewed' });

    expect(Object.keys(record).sort()).toEqual([
      'actionId',
      'actorId',
      'at',
      'decision',
      'kind',
      'pageKey',
      'target',
      'verb',
    ]);
    expect(record.actionId).toBe(actionIdempotencyKey({ ...caller, descriptor }));
    expect(record.decision).toBe('previewed');
    expect(Number.isNaN(Date.parse(record.at))).toBe(false);
  });

  it('keeps the descriptor shape strict so a preview cannot smuggle extra fields', () => {
    expect(actionDescriptorSchema.safeParse(navigate()).success).toBe(true);
    expect(actionDescriptorSchema.safeParse({ ...navigate(), applied: true }).success).toBe(false);
  });
});
