import { describe, it, expect, vi } from 'vitest';
import { extractUser, requireAuth, authorize } from '../auth.js';

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('extractUser', () => {
  it('leaves req.user undefined when x-user-id is absent', () => {
    const req = { headers: {} };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('builds req.user from gateway-injected headers', () => {
    const req = {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
        'x-user-email': 'a@test.com',
        'x-user-name': 'Admin',
        'x-user-permissions': '["view_reports"]',
        'x-user-is-super-admin': 'true',
      },
    };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user).toEqual({
      id: 'user-1',
      role: 'admin',
      email: 'a@test.com',
      name: 'Admin',
      permissions: ['view_reports'],
      isSuperAdmin: true,
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to an empty permissions array on malformed JSON instead of throwing', () => {
    const req = { headers: { 'x-user-id': 'user-1', 'x-user-permissions': '{not json' } };
    const next = vi.fn();

    expect(() => extractUser(req, {}, next)).not.toThrow();
    expect(req.user.permissions).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to an empty array when the permissions header is a non-array JSON value', () => {
    const req = { headers: { 'x-user-id': 'user-1', 'x-user-permissions': '"oops"' } };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user.permissions).toEqual([]);
  });
});

describe('requireAuth', () => {
  it('calls next(AppError 401) when req.user is missing', () => {
    const next = vi.fn();
    requireAuth({}, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next() with no error when req.user is present', () => {
    const next = vi.fn();
    requireAuth({ user: { id: '1' } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize', () => {
  it('rejects with 401 when req.user is missing', () => {
    const next = vi.fn();
    authorize('admin')({}, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects with 403 when the role is not in the allowed list', () => {
    const next = vi.fn();
    authorize('admin')({ user: { role: 'salesRep', isSuperAdmin: false } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows a matching role through', () => {
    const next = vi.fn();
    authorize('admin', 'salesRep')({ user: { role: 'salesRep', isSuperAdmin: false } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows a superAdmin through regardless of the role list', () => {
    const next = vi.fn();
    authorize('admin')({ user: { role: 'customer', isSuperAdmin: true } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});
