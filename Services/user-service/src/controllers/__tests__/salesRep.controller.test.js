import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockFindFirst, mockFindMany, mockCount, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    user: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

import {
  getAllSalesReps, getSalesRepById, createSalesRep, updateSalesRep, deleteSalesRep,
  getSalesRepStats, toggleSalesRepStatus, resetSalesRepPassword, getSalesRepPerformance,
  updateSalesRepCommission, getOnlineSalesReps,
} from '../salesRep.controller.js';

const ID = '11111111-1111-4111-8111-111111111111';
const ACTOR = { id: '22222222-2222-4222-8222-222222222222', role: 'admin' };

function buildReqRes({ body = {}, params = {}, query = {}, user = ACTOR } = {}) {
  const req = { body, params, query, user };
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
  const next = vi.fn();
  return { req, res, next };
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockFindFirst.mockReset();
  mockFindMany.mockReset();
  mockCount.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

describe('getAllSalesReps', () => {
  it('scopes the query to role: salesRep and returns a flat array + top-level pagination', async () => {
    mockFindMany.mockResolvedValue([{ id: ID, role: 'salesRep', password: 'hash' }]);
    mockCount.mockResolvedValue(1);
    const { req, res, next } = buildReqRes();

    await getAllSalesReps(req, res, next);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'salesRep' } }));
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: [{ id: ID, role: 'salesRep' }],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });
  });
});

describe('getSalesRepById', () => {
  it('returns 404 when no salesRep with that id exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await getSalesRepById(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('createSalesRep', () => {
  it('creates the user with role salesRep and a generated temp password', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: ID, role: 'salesRep', password: 'hashed' });
    const { req, res, next } = buildReqRes({ body: { name: 'Priya Nair', email: 'priya@test.com' } });

    await createSalesRep(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'salesRep', isTempPassword: true, mustChangePassword: true }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects a duplicate email', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing' });
    const { req, res, next } = buildReqRes({ body: { name: 'Priya Nair', email: 'priya@test.com' } });

    await createSalesRep(req, res, next);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('updateSalesRep', () => {
  it('updates the provided fields', async () => {
    mockUpdate.mockResolvedValue({ id: ID, name: 'Updated Rep' });
    const { req, res, next } = buildReqRes({ params: { id: ID }, body: { name: 'Updated Rep' } });

    await updateSalesRep(req, res, next);

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: ID }, data: { name: 'Updated Rep' } });
  });
});

describe('deleteSalesRep', () => {
  it('deletes when the rep exists', async () => {
    mockFindFirst.mockResolvedValue({ id: ID, role: 'salesRep' });
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await deleteSalesRep(req, res, next);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('returns 404 when the rep does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await deleteSalesRep(req, res, next);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('getSalesRepStats', () => {
  it('returns total/active/inactive scoped to salesRep', async () => {
    mockCount.mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    const { req, res, next } = buildReqRes();

    await getSalesRepStats(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { total: 6, active: 4, inactive: 2 } });
  });
});

describe('toggleSalesRepStatus', () => {
  it('flips isActive', async () => {
    mockFindFirst.mockResolvedValue({ id: ID, role: 'salesRep', isActive: true });
    mockUpdate.mockResolvedValue({ id: ID, isActive: false });
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await toggleSalesRepStatus(req, res, next);

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: ID }, data: { isActive: false } });
  });
});

describe('resetSalesRepPassword', () => {
  it('returns a temp password', async () => {
    mockUpdate.mockResolvedValue({ id: ID });
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await resetSalesRepPassword(req, res, next);

    expect(res.json.mock.calls[0][0].data.tempPassword).toBeTruthy();
  });
});

describe('getSalesRepPerformance (documented stub)', () => {
  it('returns a placeholder note instead of real metrics', async () => {
    mockFindFirst.mockResolvedValue({ id: ID, name: 'Priya Nair', role: 'salesRep' });
    const { req, res, next } = buildReqRes({ params: { id: ID } });

    await getSalesRepPerformance(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { salesRepId: ID, name: 'Priya Nair', metrics: { note: 'Detailed performance available via analytics-service' } },
    });
  });
});

describe('updateSalesRepCommission (documented stub)', () => {
  it('validates the id but does not persist anything', async () => {
    const { req, res, next } = buildReqRes({ params: { id: ID }, body: { commissionRate: 15 } });

    await updateSalesRepCommission(req, res, next);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Commission rate updated', data: {} });
  });

  it('still rejects a malformed id with 400', async () => {
    const { req, res, next } = buildReqRes({ params: { id: 'not-a-uuid' } });

    await updateSalesRepCommission(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('getOnlineSalesReps', () => {
  it('queries active reps with lastActivity within the 5-minute cutoff', async () => {
    mockFindMany.mockResolvedValue([]);
    const { req, res, next } = buildReqRes();

    await getOnlineSalesReps(req, res, next);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: 'salesRep', isActive: true, lastActivity: { gte: expect.any(Date) } }),
    }));
  });
});
