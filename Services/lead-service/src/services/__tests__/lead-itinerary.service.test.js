import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLeadFindUnique,
  mockPricingCreate,
  mockPricingUpdate,
  mockDayDeleteMany,
  mockLineDeleteMany,
  mockLeadUpdate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockLeadFindUnique: vi.fn(),
  mockPricingCreate: vi.fn(),
  mockPricingUpdate: vi.fn(),
  mockDayDeleteMany: vi.fn(),
  mockLineDeleteMany: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate },
    leadPricing: { create: mockPricingCreate, update: mockPricingUpdate },
    leadItineraryDay: { deleteMany: mockDayDeleteMany },
    leadCostLine: { deleteMany: mockLineDeleteMany },
    $transaction: mockTransaction,
  },
}));

import {
  buildDaysCreateData,
  buildAutoCostLines,
  serializeLeadDays,
  applyLeadItinerary,
} from '../lead-itinerary.service.js';
import AppError from '../../utils/appError.js';

const editorDays = [
  {
    dayNumber: 1,
    title: 'Kandy',
    breakfastCount: 2,
    lunchCount: 1,
    dinnerCount: 1,
    accommodation: { totalAmount: 100 },
    flights: [],
    places: [{ placeId: 'p1', customName: 'Temple', orderIndex: 0 }],
    activities: [{ activityId: null, name: 'Tour', defaultCost: 50, costOverride: null }],
    transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'VAN', pricingModel: 'PER_VEHICLE', unitCost: 300 }],
  },
];

const leadFixture = (overrides = {}) => ({
  id: 'lead-1',
  packageId: 'pkg-1',
  packageName: 'Sri Lanka Explorer',
  lifecycleStatus: 'NEW',
  numberOfTravelers: 2,
  pricing: null,
  costLines: [],
  itineraryDays: [],
  ...overrides,
});

describe('buildDaysCreateData', () => {
  it('maps editor days into nested prisma create payloads', () => {
    const data = buildDaysCreateData(editorDays);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      dayNumber: 1,
      breakfastCount: 2,
      accommodation: { totalAmount: 100 },
    });
    expect(data[0].places.create[0]).toEqual({ placeId: 'p1', customName: 'Temple', orderIndex: 0 });
    expect(data[0].activities.create[0]).toMatchObject({ name: 'Tour', defaultCost: 50 });
    expect(data[0].transports.create[0]).toMatchObject({ pricingModel: 'PER_VEHICLE', unitCost: 300 });
  });
});

describe('buildAutoCostLines', () => {
  it('builds persistence-shaped AUTO lines from editor days', () => {
    const lines = buildAutoCostLines(editorDays);
    expect(lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'food', basis: 'PER_PERSON', estimatedUnitPrice: 60, source: 'AUTO' }),
      expect.objectContaining({ category: 'activity', basis: 'PER_PERSON', estimatedUnitPrice: 50, source: 'AUTO' }),
      expect.objectContaining({ category: 'transportation', basis: 'PER_VEHICLE', estimatedUnitPrice: 300, source: 'AUTO' }),
      expect.objectContaining({ category: 'accommodation', basis: 'PER_PERSON', estimatedUnitPrice: 100, source: 'AUTO' }),
    ]));
    expect(lines.every((l) => l.estimatedUnitPrice != null)).toBe(true);
  });
});

describe('serializeLeadDays', () => {
  it('returns the editor day shape from persisted rows', () => {
    const lead = {
      itineraryDays: [{
        dayNumber: 1,
        title: 'Kandy',
        description: null,
        breakfastCount: 2,
        lunchCount: 1,
        dinnerCount: 1,
        mealPriceOverride: null,
        accommodation: { totalAmount: 100 },
        flights: [],
        places: [{ id: 'dp1', placeId: 'p1', customName: 'Temple', orderIndex: 0 }],
        activities: [{ id: 'da1', activityId: null, name: 'Tour', defaultCost: '50.00', costOverride: null, orderIndex: 0 }],
        transports: [{ id: 'dt1', routeType: 'DAILY_ROUTING', transportMode: 'VAN', pricingModel: 'PER_VEHICLE', unitCost: '300.00', distanceKm: null, origin: null, destination: null }],
      }],
    };
    const days = serializeLeadDays(lead);
    expect(days[0]).toMatchObject({ dayNumber: 1, breakfastCount: 2 });
    expect(days[0].places[0]).toMatchObject({ placeId: 'p1', customName: 'Temple' });
    expect(days[0].activities[0].defaultCost).toBe(50);
    expect(days[0].transports[0].unitCost).toBe(300);
  });
});

describe('applyLeadItinerary', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockPricingCreate.mockReset();
    mockPricingUpdate.mockReset();
    mockDayDeleteMany.mockReset();
    mockLineDeleteMany.mockReset();
    mockLeadUpdate.mockReset();
    mockTransaction.mockReset();
    mockTransaction.mockImplementation(async (ops) => Promise.all(ops));
    mockPricingCreate.mockResolvedValue({ id: 'pr-1', currency: 'USD' });
    mockPricingUpdate.mockResolvedValue({ id: 'pr-1' });
    mockLeadUpdate.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'DRAFTING' });
  });

  it('blocks itinerary edits once the lead is quoted or later', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'QUOTED' }));
    await expect(
      applyLeadItinerary({ leadId: 'lead-1', days: editorDays }),
    ).rejects.toThrow(AppError);
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('creates pricing, replaces days, regenerates lines and drafts a NEW lead', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce(leadFixture())
      .mockResolvedValueOnce(leadFixture({ lifecycleStatus: 'DRAFTING', costLines: [{ id: 'auto-1', category: 'food', basis: 'PER_PERSON', quantity: 1, estimatedUnitPrice: '60.00', actualUnitPrice: null, marginType: null, marginValue: null, source: 'AUTO' }] }));

    const result = await applyLeadItinerary({
      leadId: 'lead-1',
      days: editorDays,
      pricingSettings: { marginType: 'PERCENTAGE', marginValue: 10 },
      actorId: 'user-1',
    });

    expect(mockPricingCreate).toHaveBeenCalled();
    expect(mockDayDeleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
    expect(mockLineDeleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1', source: 'AUTO' } });
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({
        lifecycleStatus: 'DRAFTING',
        statusHistory: { create: expect.arrayContaining([expect.objectContaining({ status: 'DRAFTING' })]) },
      }),
    }));
    expect(mockPricingUpdate).toHaveBeenCalled();
    expect(result.lifecycleStatus).toBe('DRAFTING');
  });

  it('keeps a DRAFTING lead in DRAFTING', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce(leadFixture({ lifecycleStatus: 'DRAFTING', pricing: { id: 'pr-1', currency: 'USD' } }))
      .mockResolvedValueOnce(leadFixture({ lifecycleStatus: 'DRAFTING', pricing: { id: 'pr-1' }, costLines: [] }));

    const result = await applyLeadItinerary({ leadId: 'lead-1', days: editorDays });
    expect(result.lifecycleStatus).toBe('DRAFTING');
    const updateCall = mockLeadUpdate.mock.calls[0][0];
    expect(updateCall.data.lifecycleStatus).toBeUndefined();
  });

  it('moves a REVISION lead back to DRAFTING', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce(leadFixture({ lifecycleStatus: 'REVISION', pricing: { id: 'pr-1', currency: 'USD' } }))
      .mockResolvedValueOnce(leadFixture({ lifecycleStatus: 'REVISION', pricing: { id: 'pr-1' }, costLines: [] }));

    const result = await applyLeadItinerary({ leadId: 'lead-1', days: editorDays });
    expect(result.lifecycleStatus).toBe('DRAFTING');
  });

  it('throws when the lead does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);
    await expect(applyLeadItinerary({ leadId: 'ghost', days: [] })).rejects.toThrow(/Lead not found/);
  });
});
