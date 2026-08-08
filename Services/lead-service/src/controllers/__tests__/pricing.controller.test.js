import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCostLineFindMany } = vi.hoisted(() => ({
  mockCostLineFindMany: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    leadCostLine: { findMany: mockCostLineFindMany },
  },
}));

// recomputeLeadPricing is imported by pricing.controller.js from lead.controller.js,
// which pulls in the full prisma surface — not needed for calculatePricing/previewPricing,
// stub it out so importing the module under test doesn't require mocking all of that too.
vi.mock('../lead.controller.js', () => ({
  recomputeLeadPricing: vi.fn(),
}));

import { calculatePricing, previewPricing } from '../pricing.controller.js';

const dayWithMeals = { dayNumber: 1, breakfastCount: 1, lunchCount: 0, dinnerCount: 1, accommodation: {} };

const manualFlightLineFixture = (overrides = {}) => ({
  id: 'line-1',
  leadId: 'lead-1',
  category: 'transportation',
  description: 'Flight: CMB → DXB',
  basis: 'PER_PERSON',
  quantity: 2,
  estimatedUnitPrice: 150,
  actualUnitPrice: null,
  marginType: null,
  marginValue: null,
  source: 'MANUAL',
  orderIndex: 0,
  ...overrides,
});

function buildReqRes({ leadId = 'lead-1', body = {} } = {}) {
  const req = { params: { id: leadId }, body };
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
  const next = vi.fn();
  return { req, res, next };
}

describe('calculatePricing — merges persisted MANUAL lines with days-derived AUTO lines', () => {
  beforeEach(() => {
    mockCostLineFindMany.mockReset();
    mockCostLineFindMany.mockResolvedValue([]);
  });

  it('rejects a body with neither lines nor days', async () => {
    const { req, res, next } = buildReqRes({ body: { travelers: 2 } });
    await calculatePricing(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/lines or days/i) }));
  });

  it('computes from days alone when there are no persisted MANUAL lines', async () => {
    const { req, res, next } = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await calculatePricing(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const [{ data }] = res.json.mock.calls[0];
    expect(data.financials.estimatedTotal).toBeGreaterThan(0);
  });

  it('fetches only this lead\'s MANUAL-source cost lines', async () => {
    const { req, res, next } = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await calculatePricing(req, res, next);

    expect(mockCostLineFindMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1', source: 'MANUAL' },
      orderBy: { orderIndex: 'asc' },
    });
  });

  it('includes a persisted MANUAL transfer-flight line in the total', async () => {
    mockCostLineFindMany.mockResolvedValueOnce([]);
    const withoutFlight = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await calculatePricing(withoutFlight.req, withoutFlight.res, withoutFlight.next);
    const baseline = withoutFlight.res.json.mock.calls[0][0].data.financials.estimatedTotal;

    mockCostLineFindMany.mockResolvedValueOnce([manualFlightLineFixture()]);
    const withFlight = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await calculatePricing(withFlight.req, withFlight.res, withFlight.next);
    const withFlightTotal = withFlight.res.json.mock.calls[0][0].data.financials.estimatedTotal;

    // 150/person * 2 travelers = 300 added on top of the meals-only baseline.
    expect(withFlightTotal).toBeCloseTo(baseline + 300, 2);
  });

  it('multiplies the MANUAL flight line by the current travelers count, not a stored quantity', async () => {
    mockCostLineFindMany.mockResolvedValue([manualFlightLineFixture({ quantity: 1 })]);

    const { req, res, next } = buildReqRes({ body: { days: [], travelers: 4 } });
    await calculatePricing(req, res, next);

    const { financials } = res.json.mock.calls[0][0].data;
    // PER_PERSON basis re-derives quantity from the live `travelers` value (4),
    // ignoring whatever quantity happened to be stored on the row.
    expect(financials.estimatedTotal).toBeCloseTo(150 * 4, 2);
  });

  it('does not double-count by also pulling persisted AUTO lines', async () => {
    mockCostLineFindMany.mockResolvedValue([]); // MANUAL-only query — AUTO lines never returned here
    const { req, res, next } = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await calculatePricing(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCostLineFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: 'MANUAL' }) }));
  });

  it('uses the explicit lines array as-is when provided, skipping the DB lookup entirely', async () => {
    const { req, res, next } = buildReqRes({
      body: { lines: [{ category: 'other', basis: 'FIXED', estimatedUnit: 100, source: 'MANUAL' }], travelers: 1 },
    });
    await calculatePricing(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCostLineFindMany).not.toHaveBeenCalled();
  });
});

describe('previewPricing — standalone, unaffected by the MANUAL-line merge', () => {
  it('computes purely from days with no database lookup', async () => {
    const { req, res, next } = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await previewPricing(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCostLineFindMany).not.toHaveBeenCalled();
    const { financials } = res.json.mock.calls[0][0].data;
    expect(financials.estimatedTotal).toBeGreaterThan(0);
  });

  it('rejects a body with neither lines nor days', async () => {
    const { req, res, next } = buildReqRes({ body: { travelers: 2 } });
    await previewPricing(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/lines or days/i) }));
  });
});
