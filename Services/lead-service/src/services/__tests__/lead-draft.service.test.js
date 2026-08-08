import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCount, mockLeadUpdate, mockDayDeleteMany, mockLineDeleteMany, mockTransaction } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockDayDeleteMany: vi.fn(),
  mockLineDeleteMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    leadItineraryDay: { count: mockCount, deleteMany: mockDayDeleteMany },
    leadCostLine: { deleteMany: mockLineDeleteMany },
    lead: { update: mockLeadUpdate },
    $transaction: mockTransaction,
  },
}));

import {
  buildDraftData,
  fetchPackage,
  copyPackageToLead,
  isItineraryPristine,
  replaceLeadItineraryFromPackage,
} from '../lead-draft.service.js';
import AppError from '../../utils/appError.js';

const packageFixture = {
  id: 'pkg-1',
  title: 'Sri Lanka Explorer',
  currency: 'USD',
  defaultMarginType: 'PERCENTAGE',
  defaultMarginInput: 10,
  itineraryDays: [
    {
      dayNumber: 1,
      title: 'Kandy',
      description: 'Temple day',
      breakfastCount: 2,
      lunchCount: 1,
      dinnerCount: 1,
      mealPriceOverride: null,
      accommodation: { totalAmount: 100, name: 'Kandy Hotel' },
      flights: [],
      places: [{ placeId: 'p1', customName: 'Temple of the Tooth', orderIndex: 0 }],
      activities: [{ activityId: 'a1', name: 'Temple Tour', defaultCost: 50, costOverride: null }],
      transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'VAN', pricingModel: 'PER_VEHICLE', unitCost: 300, distanceKm: null }],
    },
  ],
};

describe('buildDraftData', () => {
  it('maps the package into itinerary days, AUTO cost lines and pricing defaults', () => {
    const data = buildDraftData(packageFixture);

    expect(data.days).toHaveLength(1);
    expect(data.days[0]).toMatchObject({
      dayNumber: 1,
      breakfastCount: 2,
      lunchCount: 1,
      dinnerCount: 1,
      accommodation: { totalAmount: 100, name: 'Kandy Hotel' },
    });
    expect(data.days[0].places.create[0]).toEqual({
      placeId: 'p1',
      customName: 'Temple of the Tooth',
      orderIndex: 0,
    });
    expect(data.days[0].transports.create[0]).toMatchObject({
      pricingModel: 'PER_VEHICLE',
      unitCost: 300,
    });

    expect(data.costLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'food', basis: 'PER_PERSON', estimatedUnitPrice: 60, source: 'AUTO' }),
      expect.objectContaining({ category: 'activity', basis: 'PER_PERSON', estimatedUnitPrice: 50, source: 'AUTO' }),
      expect.objectContaining({ category: 'transportation', basis: 'PER_VEHICLE', estimatedUnitPrice: 300, quantity: 1, source: 'AUTO' }),
      expect.objectContaining({ category: 'accommodation', basis: 'PER_PERSON', estimatedUnitPrice: 100, source: 'AUTO' }),
    ]));

    expect(data.pricing).toEqual({
      currency: 'USD',
      marginType: 'PERCENTAGE',
      marginValue: 10,
    });
  });

  it('falls back to USD currency and no margin when the package omits them', () => {
    const data = buildDraftData({ id: 'x', title: 'Basic' });
    expect(data.pricing).toEqual({
      currency: 'USD',
      marginType: null,
      marginValue: null,
    });
  });

  it('builds cost lines with per-person basis from meal counts', () => {
    const data = buildDraftData(packageFixture);
    const food = data.costLines.find((l) => l.category === 'food');
    expect(food).toEqual(expect.objectContaining({
      basis: 'PER_PERSON',
      estimatedUnitPrice: 60,
      description: 'Meals',
    }));
  });
});

describe('fetchPackage', () => {
  it('returns the package payload from the service response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'pkg-1', title: 'Sri Lanka Explorer' } }),
    });
    await expect(fetchPackage('pkg-1', fetchImpl)).resolves.toMatchObject({ id: 'pkg-1' });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/api/v1/packages/pkg-1'));
  });

  it('throws a 404-style error when the package is missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchPackage('nope', fetchImpl)).rejects.toThrow(AppError);
  });
});

describe('copyPackageToLead', () => {
  beforeEach(() => {
    mockCount.mockReset();
    mockLeadUpdate.mockReset();
    mockLeadUpdate.mockResolvedValue({ id: 'lead-1' });
  });

  it('creates itinerary, cost lines and pricing on the first copy', async () => {
    mockCount.mockResolvedValue(0);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: packageFixture }),
    });

    const result = await copyPackageToLead({
      leadId: 'lead-1',
      packageId: 'pkg-1',
      travelers: 2,
      fetchImpl,
    });

    expect(result.id).toBe('lead-1');
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({
        packageName: 'Sri Lanka Explorer',
        sourcePackageId: 'pkg-1',
        pricing: { create: expect.objectContaining({ currency: 'USD', marginType: 'PERCENTAGE' }) },
        costLines: { create: expect.arrayContaining([expect.objectContaining({ category: 'food' })]) },
      }),
    }));
  });

  it('refuses to copy when the lead already has a draft', async () => {
    mockCount.mockResolvedValue(1);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: packageFixture }),
    });

    await expect(
      copyPackageToLead({ leadId: 'lead-1', packageId: 'pkg-1', fetchImpl }),
    ).rejects.toThrow(/already has a draft copy/);
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });
});

describe('isItineraryPristine', () => {
  it('is true when sourcePackageId matches the current packageId', () => {
    expect(isItineraryPristine({ packageId: 'pkg-1', sourcePackageId: 'pkg-1' })).toBe(true);
  });

  it('is false when the itinerary was manually customized (sourcePackageId cleared)', () => {
    expect(isItineraryPristine({ packageId: 'pkg-1', sourcePackageId: null })).toBe(false);
  });

  it('is false when sourcePackageId points at a different, stale package', () => {
    expect(isItineraryPristine({ packageId: 'pkg-2', sourcePackageId: 'pkg-1' })).toBe(false);
  });

  it('is false for a lead with no itinerary yet', () => {
    expect(isItineraryPristine({ packageId: 'pkg-1', sourcePackageId: null })).toBe(false);
    expect(isItineraryPristine({ packageId: null, sourcePackageId: null })).toBe(false);
  });
});

describe('replaceLeadItineraryFromPackage', () => {
  let mockPrisma;

  beforeEach(() => {
    mockDayDeleteMany.mockReset();
    mockLineDeleteMany.mockReset();
    mockTransaction.mockReset().mockResolvedValue([]);
    mockLeadUpdate.mockReset().mockResolvedValue({ id: 'lead-1', packageId: 'pkg-2' });
    mockPrisma = {
      leadItineraryDay: { deleteMany: mockDayDeleteMany },
      leadCostLine: { deleteMany: mockLineDeleteMany },
      lead: { update: mockLeadUpdate },
      $transaction: mockTransaction,
    };
  });

  it('deletes the old itinerary/AUTO cost lines and recreates them from the new package', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: packageFixture }),
    });

    await replaceLeadItineraryFromPackage({
      leadId: 'lead-1',
      packageId: 'pkg-1',
      fetchImpl,
      prismaClient: mockPrisma,
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockDayDeleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
    expect(mockLineDeleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1', source: 'AUTO' } });
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({
        packageName: 'Sri Lanka Explorer',
        sourcePackageId: 'pkg-1',
        itineraryDays: { create: expect.any(Array) },
        costLines: { create: expect.arrayContaining([expect.objectContaining({ category: 'food' })]) },
      }),
    }));
  });

  it('does not touch LeadPricing settings — margin/discount stay caller-controlled', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: packageFixture }),
    });

    await replaceLeadItineraryFromPackage({
      leadId: 'lead-1',
      packageId: 'pkg-1',
      fetchImpl,
      prismaClient: mockPrisma,
    });

    const [{ data }] = mockLeadUpdate.mock.calls[0];
    expect(data).not.toHaveProperty('pricing');
  });
});
