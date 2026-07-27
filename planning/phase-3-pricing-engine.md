# Phase 3: Pricing Engine

## Goal

Implement the 5 pricing calculation rules, expose API endpoints for computing and applying pricing, and wire auto-recalculation when the state machine triggers it (BOOKING_IN_PROGRESS → CONFIRMED).

## Prerequisites

- Phase 2 complete (state machine working, gatekeepers enforced)

## Step-by-Step Implementation

### Step 1: Create the pricing service

Create `Services/lead-service/src/services/pricing.service.js`:

```javascript
/**
 * Rule 1: TotalEstimatedCost = PackageBaseCost + EstimatedFlightCost + EstimatedHotelCost
 */
export function calculateTotalEstimatedCost(estimated = {}) {
  return (estimated.packageBaseCost || 0) +
    (estimated.estimatedFlightCost || 0) +
    (estimated.estimatedHotelCost || 0);
}

/**
 * Rule 2: Quoted Selling Price
 *   PERCENTAGE: TotalEstimatedCost * (1 + MarkupValue / 100)
 *   FLAT_FEE:   TotalEstimatedCost + MarkupValue
 */
export function calculateQuotedSellingPrice(totalEstimated, markupStrategy, markupValue) {
  const val = markupValue || 0;
  if (markupStrategy === 'PERCENTAGE') {
    return totalEstimated * (1 + val / 100);
  }
  return totalEstimated + val; // FLAT_FEE default
}

/**
 * Rule 3: BalanceDue = max(0, QuotedSellingPrice - DepositPaid)
 */
export function calculateBalanceDue(quotedSellingPrice, depositPaid = 0) {
  return Math.max(0, (quotedSellingPrice || 0) - depositPaid);
}

/**
 * Rule 4: TotalActualCost = PackageBaseCost + ActualFlightCost + ActualHotelCost
 */
export function calculateTotalActualCost(estimated = {}, actual = {}) {
  return (estimated.packageBaseCost || 0) +
    (actual.actualFlightCost || 0) +
    (actual.actualHotelCost || 0);
}

/**
 * Rule 5: FinalRealizedProfit = QuotedSellingPrice - TotalActualCost
 */
export function calculateFinalRealizedProfit(quotedSellingPrice, totalActualCost) {
  return (quotedSellingPrice || 0) - (totalActualCost || 0);
}

/**
 * Compute all pricing fields. This is the main entry point.
 * @param {Object} financials - { estimated, clientPricing, actual }
 * @returns {Object} Complete financials with all computed fields
 */
export function computeFinancials(financials = {}) {
  const estimated = financials.estimated || {};
  const clientPricing = financials.clientPricing || {};
  const actual = financials.actual || {};

  // Rule 1
  const totalEstimatedCost = calculateTotalEstimatedCost(estimated);

  // Rule 2
  const quotedSellingPrice = calculateQuotedSellingPrice(
    totalEstimatedCost,
    clientPricing.markupStrategy,
    clientPricing.markupValue,
  );

  // Rule 3
  const balanceDue = calculateBalanceDue(quotedSellingPrice, clientPricing.depositPaid);

  // Rule 4
  const totalActualCost = calculateTotalActualCost(estimated, actual);

  // Rule 5
  const finalRealizedProfit = calculateFinalRealizedProfit(quotedSellingPrice, totalActualCost);

  return {
    estimated: {
      packageBaseCost: estimated.packageBaseCost || 0,
      estimatedFlightCost: estimated.estimatedFlightCost || 0,
      estimatedHotelCost: estimated.estimatedHotelCost || 0,
      totalEstimatedCost,
    },
    clientPricing: {
      markupStrategy: clientPricing.markupStrategy || 'FLAT_FEE',
      markupValue: clientPricing.markupValue || 0,
      quotedSellingPrice,
      depositPaid: clientPricing.depositPaid || 0,
      balanceDue,
    },
    actual: {
      actualFlightCost: actual.actualFlightCost ?? null,
      actualHotelCost: actual.actualHotelCost ?? null,
      totalActualCost,
      finalRealizedProfit,
    },
  };
}
```

### Step 2: Create the pricing controller

Create `Services/lead-service/src/controllers/pricing.controller.js`:

```javascript
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computeFinancials } from '../services/pricing.service.js';

/**
 * POST /api/v1/leads/:id/pricing/calculate
 * Compute pricing without persisting (dry-run/preview).
 */
export const calculatePricing = asyncHandler(async (req, res) => {
  const { financials } = req.body;
  if (!financials) {
    throw new AppError('financials object is required', 400);
  }
  const computed = computeFinancials(financials);
  res.json({ success: true, data: { financials: computed } });
});

/**
 * POST /api/v1/leads/:id/pricing/apply
 * Compute AND persist pricing to the lead record.
 */
export const applyPricing = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const { financials } = req.body;
  if (!financials) {
    throw new AppError('financials object is required', 400);
  }

  const computed = computeFinancials(financials);

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { financials: computed },
  });

  res.json({ success: true, data: { financials: updated.financials } });
});
```

### Step 3: Create pricing routes

Create `Services/lead-service/src/routes/pricing.routes.js`:

```javascript
import { Router } from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import { calculatePricing, applyPricing } from '../controllers/pricing.controller.js';

const router = Router({ mergeParams: true });
router.use(extractUser, requireAuth, authorize('admin', 'salesRep'));

router.post('/calculate', calculatePricing);
router.post('/apply', applyPricing);

export default router;
```

### Step 4: Mount pricing routes

Edit `Services/lead-service/src/routes/lead.routes.js` — add at the end before the export:

```javascript
import pricingRoutes from './pricing.routes.js';

// ... existing routes ...

router.use('/:id/pricing', pricingRoutes);

export default router;
```

### Step 5: Wire auto-recalculation in lead controller

Edit `Services/lead-service/src/controllers/lead.controller.js`:

```javascript
import { computeFinancials } from '../services/pricing.service.js';

// Inside updateLead, after the state machine call, add:
if (result?.recalculate) {
  const merged = {
    ...(lead.financials || {}),
    ...(validatedBody.financials || {}),
  };
  updateData.financials = computeFinancials(merged);
}
```

### Step 6: Register pricing routes in index.js

Edit `Services/lead-service/src/index.js` — the pricing routes are already mounted via `lead.routes.js` at `/:id/pricing`, so this may not need changes. Verify the lead routes are correctly registered.

### Step 7: Create pricing tests

Create `Services/lead-service/src/services/__tests__/pricing.service.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import {
  calculateTotalEstimatedCost,
  calculateQuotedSellingPrice,
  calculateBalanceDue,
  calculateTotalActualCost,
  calculateFinalRealizedProfit,
  computeFinancials,
} from '../pricing.service.js';

describe('calculateTotalEstimatedCost', () => {
  it('sums all estimated costs (Rule 1)', () => {
    expect(calculateTotalEstimatedCost({
      packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300,
    })).toBe(1800);
  });

  it('returns 0 for empty input', () => {
    expect(calculateTotalEstimatedCost()).toBe(0);
    expect(calculateTotalEstimatedCost({})).toBe(0);
  });

  it('treats missing fields as 0', () => {
    expect(calculateTotalEstimatedCost({ packageBaseCost: 500 })).toBe(500);
  });
});

describe('calculateQuotedSellingPrice', () => {
  it('applies PERCENTAGE markup (Rule 2)', () => {
    expect(calculateQuotedSellingPrice(1000, 'PERCENTAGE', 10)).toBe(1100);
  });

  it('applies FLAT_FEE markup (Rule 2)', () => {
    expect(calculateQuotedSellingPrice(1000, 'FLAT_FEE', 200)).toBe(1200);
  });

  it('defaults to FLAT_FEE when strategy is missing', () => {
    expect(calculateQuotedSellingPrice(1000, undefined, 200)).toBe(1200);
  });

  it('returns base price when markupValue is 0', () => {
    expect(calculateQuotedSellingPrice(1000, 'PERCENTAGE', 0)).toBe(1000);
  });

  it('handles 100% markup', () => {
    expect(calculateQuotedSellingPrice(500, 'PERCENTAGE', 100)).toBe(1000);
  });
});

describe('calculateBalanceDue', () => {
  it('computes balance due (Rule 3)', () => {
    expect(calculateBalanceDue(1100, 300)).toBe(800);
  });

  it('returns 0 when fully paid', () => {
    expect(calculateBalanceDue(500, 500)).toBe(0);
  });

  it('returns 0 when overpaid', () => {
    expect(calculateBalanceDue(500, 600)).toBe(0);
  });

  it('returns quotedSellingPrice when no deposit', () => {
    expect(calculateBalanceDue(1000, 0)).toBe(1000);
    expect(calculateBalanceDue(1000)).toBe(1000);
  });
});

describe('calculateTotalActualCost', () => {
  it('sums actual costs with package base (Rule 4)', () => {
    expect(calculateTotalActualCost(
      { packageBaseCost: 1000 },
      { actualFlightCost: 600, actualHotelCost: 400 },
    )).toBe(2000);
  });

  it('defaults missing actual costs to 0', () => {
    expect(calculateTotalActualCost(
      { packageBaseCost: 1000 },
      { actualFlightCost: 600 },
    )).toBe(1600);
  });

  it('returns packageBaseCost when no actuals', () => {
    expect(calculateTotalActualCost({ packageBaseCost: 1000 }, {})).toBe(1000);
  });
});

describe('calculateFinalRealizedProfit', () => {
  it('computes profit (Rule 5)', () => {
    expect(calculateFinalRealizedProfit(1500, 1200)).toBe(300);
  });

  it('computes loss', () => {
    expect(calculateFinalRealizedProfit(1000, 1200)).toBe(-200);
  });

  it('returns 0 for break-even', () => {
    expect(calculateFinalRealizedProfit(1000, 1000)).toBe(0);
  });
});

describe('computeFinancials', () => {
  it('full integration: all fields computed correctly', () => {
    const result = computeFinancials({
      estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 },
      clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 10, depositPaid: 300 },
      actual: { actualFlightCost: 600, actualHotelCost: 400 },
    });

    expect(result.estimated.totalEstimatedCost).toBe(1800);
    expect(result.clientPricing.quotedSellingPrice).toBe(1980);
    expect(result.clientPricing.balanceDue).toBe(1680);
    expect(result.actual.totalActualCost).toBe(2000);
    expect(result.actual.finalRealizedProfit).toBe(-20);
  });

  it('handles empty input without crashing', () => {
    const result = computeFinancials({});
    expect(result.estimated.totalEstimatedCost).toBe(0);
    expect(result.clientPricing.quotedSellingPrice).toBe(0);
    expect(result.clientPricing.balanceDue).toBe(0);
    expect(result.actual.totalActualCost).toBe(0);
    expect(result.actual.finalRealizedProfit).toBe(0);
  });

  it('handles null input', () => {
    const result = computeFinancials(null);
    expect(result.estimated.totalEstimatedCost).toBe(0);
  });

  it('preserves fractional values', () => {
    const result = computeFinancials({
      estimated: { packageBaseCost: 100.50, estimatedFlightCost: 50.25 },
      clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 15.5 },
    });
    expect(result.estimated.totalEstimatedCost).toBe(150.75);
    expect(result.clientPricing.quotedSellingPrice).toBeCloseTo(174.11625, 4);
  });

  it('sets null for actualFlightCost and actualHotelCost in output when not provided', () => {
    const result = computeFinancials({});
    expect(result.actual.actualFlightCost).toBeNull();
    expect(result.actual.actualHotelCost).toBeNull();
  });
});
```

### Step 8: Run tests

```bash
cd Services/lead-service && npm test
```

Expected: ~53 tests pass (4 lead-states + 12 validator + 17 state-machine + 20 pricing).

## Edge Cases to Verify

- [ ] PERCENTAGE markup with 100% (doubles the price)
- [ ] Overpayment: depositPaid > quotedSellingPrice → balanceDue = 0
- [ ] Loss scenario: actual costs exceed quoted price → negative profit
- [ ] Fractional values preserved (no rounding errors for typical currency values)
- [ ] Null financials input doesn't crash
- [ ] Empty objects don't crash

## Verification

```bash
cd Services/lead-service && npm test

# Test calculate endpoint (dry-run)
curl -X POST http://localhost:3000/api/v1/leads/<lead-id>/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"financials":{"estimated":{"packageBaseCost":1000,"estimatedFlightCost":500,"estimatedHotelCost":300},"clientPricing":{"markupStrategy":"PERCENTAGE","markupValue":10}}}'

# Test apply endpoint (persists)
curl -X POST http://localhost:3000/api/v1/leads/<lead-id>/pricing/apply \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"financials":{"estimated":{"packageBaseCost":1000,"estimatedFlightCost":500,"estimatedHotelCost":300},"clientPricing":{"markupStrategy":"FLAT_FEE","markupValue":200,"depositPaid":300}}}'

# Verify auto-recalculation on BOOKING_IN_PROGRESS -> CONFIRMED
# 1. Set lead to BOOKING_IN_PROGRESS
# 2. Update financials with actual costs
# 3. Transition to CONFIRMED
# 4. Verify finalRealizedProfit is recalculated
```

## Files Touched

| Action | File |
|--------|------|
| CREATE | `Services/lead-service/src/services/pricing.service.js` |
| CREATE | `Services/lead-service/src/services/__tests__/pricing.service.test.js` |
| CREATE | `Services/lead-service/src/controllers/pricing.controller.js` |
| CREATE | `Services/lead-service/src/routes/pricing.routes.js` |
| MODIFY | `Services/lead-service/src/routes/lead.routes.js` |
| MODIFY | `Services/lead-service/src/controllers/lead.controller.js` |
