import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the real service exports but stub the pricing computation so the test
// focuses on request flattening and the response contract.
vi.mock('../../services/package.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    recomputeBasePrice: vi.fn(() => ({
      basePrice: 500,
      breakdown: {
        meals: { total: 60 },
        activities: { total: 240 },
        transports: { total: 200 },
      },
    })),
  };
});

vi.mock('../../../../shared/pricing-engine/src/index.js', () => ({
  computeMargin: vi.fn((basePrice, type, value) => {
    const marginAmount =
      type === 'PERCENTAGE'
        ? Math.round((basePrice * value) / 100 * 100) / 100
        : value;
    return {
      basePrice,
      marginAmount,
      sellPrice: Math.round((basePrice + marginAmount) * 100) / 100,
    };
  }),
}));

import { calculatePrice } from '../package.controller.js';
import { recomputeBasePrice } from '../../services/package.service.js';

const makeRes = () => ({ json: vi.fn() });

describe('calculatePrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flattens itinerary days and returns the full pricing response contract', async () => {
    const req = {
      body: {
        itineraryDays: [
          {
            dayNumber: 1,
            breakfastCount: 2,
            lunchCount: 1,
            dinnerCount: 0,
            activities: [{ name: 'City Tour', defaultCost: 50 }],
            transports: [{ pricingModel: 'PER_VEHICLE', unitCost: 200 }],
            accommodation: { totalAmount: 100, currency: 'USD' },
          },
        ],
        defaultMarginType: 'PERCENTAGE',
        defaultMarginInput: 20,
        groupSize: 3,
      },
    };
    const res = makeRes();

    await calculatePrice(req, res);

    expect(recomputeBasePrice).toHaveBeenCalledWith(
      req.body.itineraryDays,
      [{ name: 'City Tour', defaultCost: 50 }],
      [{ pricingModel: 'PER_VEHICLE', unitCost: 200 }],
      { groupSize: 3 }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        packageCost: 600, // 500 engine + 100 accommodation
        sellPrice: 720,
        margin: { type: 'PERCENTAGE', amount: 120 },
        breakdown: {
          meals: { total: 60 },
          activities: { total: 240 },
          transports: { total: 200 },
          accommodation: { total: 100 },
        },
      },
    });
  });

  it('defaults margin/group size and tolerates an empty body', async () => {
    const req = { body: {} };
    const res = makeRes();

    await calculatePrice(req, res);

    expect(recomputeBasePrice).toHaveBeenCalledWith([], [], [], { groupSize: undefined });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        packageCost: 500,
        sellPrice: 500,
        margin: { type: 'PERCENTAGE', amount: 0 },
        breakdown: {
          meals: { total: 60 },
          activities: { total: 240 },
          transports: { total: 200 },
          accommodation: { total: 0 },
        },
      },
    });
  });
});
