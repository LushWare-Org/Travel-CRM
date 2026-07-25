import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUser, requireAuth, authorize } from '../auth.js';
import AppError from '../../utils/appError.js';

describe('extractUser', () => {
  it('should set req.user from gateway headers', () => {
    const req = {
      headers: {
        'x-user-id': 'user-123',
        'x-user-role': 'salesRep',
        'x-user-email': 'rep@test.com',
        'x-user-name': 'Test Rep',
        'x-user-permissions': '["manage_leads"]',
        'x-user-is-super-admin': 'false',
      },
    };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user).toEqual({
      id: 'user-123',
      role: 'salesRep',
      email: 'rep@test.com',
      name: 'Test Rep',
      permissions: ['manage_leads'],
      isSuperAdmin: false,
    });
    expect(next).toHaveBeenCalled();
  });

  it('should parse isSuperAdmin as boolean true', () => {
    const req = {
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'superAdmin',
        'x-user-email': 'admin@test.com',
        'x-user-name': 'Super Admin',
        'x-user-permissions': '[]',
        'x-user-is-super-admin': 'true',
      },
    };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user.isSuperAdmin).toBe(true);
  });

  it('should not set req.user when x-user-id is missing', () => {
    const req = { headers: {} };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should handle missing permissions header gracefully', () => {
    const req = {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'salesRep',
        'x-user-permissions': '[]',
      },
    };
    const next = vi.fn();

    extractUser(req, {}, next);

    expect(req.user.permissions).toEqual([]);
  });
});

describe('requireAuth', () => {
  it('should call next() when req.user exists', () => {
    const req = { user: { id: '1', role: 'admin' } };
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() with AppError when req.user is missing', () => {
    const req = {};
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].message).toContain('Not authorized');
  });
});

describe('authorize', () => {
  it('should allow a user with an allowed role', () => {
    const req = { user: { id: '1', role: 'admin', isSuperAdmin: false } };
    const next = vi.fn();
    const middleware = authorize('admin', 'salesRep');

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should block a user without an allowed role', () => {
    const req = { user: { id: '1', role: 'vendor', isSuperAdmin: false } };
    const next = vi.fn();
    const middleware = authorize('admin', 'salesRep');

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should allow superAdmin regardless of role list', () => {
    const req = { user: { id: '1', role: 'customer', isSuperAdmin: true } };
    const next = vi.fn();
    const middleware = authorize('admin', 'salesRep');

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return 401 when req.user is missing', () => {
    const req = {};
    const next = vi.fn();
    const middleware = authorize('admin');

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
