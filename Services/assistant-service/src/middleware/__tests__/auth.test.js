import { describe, it, expect, vi } from 'vitest';
import { extractUser, forwardActorHeaders, requireAuth } from '../auth.js';

const reqFor = (headers = {}, requestId) => {
  const req = { headers, requestId };
  extractUser(req, {}, () => {});
  return req;
};

const ACTOR_HEADERS = {
  'x-user-id': 'rep-1',
  'x-user-role': 'salesRep',
  'x-user-email': 'bob.sales@travelcrm.com',
  'x-user-name': 'Bob',
  'x-user-permissions': '["leads:read"]',
  'x-user-is-super-admin': 'false',
};

describe('extractUser', () => {
  it('reads the forwarded actor headers', () => {
    const req = reqFor(ACTOR_HEADERS);

    expect(req.user).toMatchObject({ id: 'rep-1', role: 'salesRep', name: 'Bob', isSuperAdmin: false });
    expect(req.user.permissions).toEqual(['leads:read']);
  });

  it('leaves req.user unset when no actor headers arrive, so requireAuth can refuse', () => {
    const req = reqFor({});
    const next = vi.fn();

    expect(req.user).toBeUndefined();

    // requireAuth hands the error to next() rather than throwing — it is Express
    // middleware, so the failure travels the error path.
    requireAuth(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ message: 'Not authorized' });
  });

  it('passes an authenticated request straight through', () => {
    const next = vi.fn();

    requireAuth(reqFor(ACTOR_HEADERS), {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('fails closed to no permissions on a malformed header, instead of throwing a 500', () => {
    // Unvalidated JSON.parse inside middleware produced a 500 on every management
    // route. A malformed header now narrows capability rather than breaking the
    // route, which is the safe direction for a security-relevant input.
    const req = reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': 'not json' });

    expect(req.user.permissions).toEqual([]);
    expect(req.user.id).toBe('rep-1');
  });

  it('rejects a permissions value that is not a bounded array of short strings', () => {
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': '{"a":1}' }).user.permissions).toEqual([]);
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': '["ok", 42]' }).user.permissions).toEqual([]);
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': '[[]]' }).user.permissions).toEqual([]);
    expect(
      reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': JSON.stringify(Array(200).fill('p')) }).user.permissions,
    ).toEqual([]);
  });

  it('keeps a well-formed permissions array', () => {
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-permissions': '["manage_leads","leads:read"]' }).user.permissions).toEqual([
      'manage_leads',
      'leads:read',
    ]);
  });

  it('drops an unusable role rather than forwarding a number or a paragraph', () => {
    expect(reqFor({ ...ACTOR_HEADERS }).user.role).toBe('salesRep');
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-role': 'x'.repeat(64) }).user.role).toBeUndefined();
    expect(reqFor({ ...ACTOR_HEADERS, 'x-user-role': '   ' }).user.role).toBeUndefined();
  });
});

describe('forwardActorHeaders', () => {
  it('forwards the actor identity to domain services', () => {
    const headers = forwardActorHeaders(reqFor(ACTOR_HEADERS, 'req-1'));

    expect(headers['x-user-id']).toBe('rep-1');
    expect(headers['x-user-role']).toBe('salesRep');
    expect(headers['x-user-permissions']).toBe('["leads:read"]');
    expect(headers['x-user-is-super-admin']).toBe('false');
  });

  it('carries the correlation id, so a downstream read can be joined to the turn', () => {
    const headers = forwardActorHeaders(reqFor(ACTOR_HEADERS, 'req-1'));

    expect(headers['x-request-id']).toBe('req-1');
  });

  it('omits the correlation id rather than sending an undefined one', () => {
    const headers = forwardActorHeaders(reqFor(ACTOR_HEADERS));

    expect(headers).not.toHaveProperty('x-request-id');
  });
});
