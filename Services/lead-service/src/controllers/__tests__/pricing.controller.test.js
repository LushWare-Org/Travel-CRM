import { describe, it, expect } from 'vitest';
import { previewPricing } from '../pricing.controller.js';

const dayWithMeals = { dayNumber: 1, breakfastCount: 1, lunchCount: 0, dinnerCount: 1, accommodation: {} };

function buildReqRes({ body = {} } = {}) {
  const req = { body };
  const res = { json: (v) => { res.body = v; }, status: () => res };
  const next = (err) => { next.err = err; };
  return { req, res, next };
}

describe('previewPricing — standalone, no lead/selection yet', () => {
  it('computes purely from days with no database lookup', async () => {
    const { req, res, next } = buildReqRes({ body: { days: [dayWithMeals], travelers: 2 } });
    await previewPricing(req, res, next);

    expect(next.err).toBeUndefined();
    expect(res.body.data.financials.estimatedTotal).toBeGreaterThan(0);
  });

  it('rejects a body with neither lines nor days', async () => {
    const { req, res, next } = buildReqRes({ body: { travelers: 2 } });
    await previewPricing(req, res, next);
    expect(next.err?.message).toMatch(/lines or days/i);
  });
});
