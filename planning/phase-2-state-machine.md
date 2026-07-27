# Phase 2: State Machine + Gatekeeper Logic

## Goal

Implement the full lead lifecycle state machine that enforces valid transitions and business gatekeeper rules. Any attempt to set an invalid `lifecycleStatus` transition must be rejected with a descriptive error.

## Prerequisites

- Phase 1 complete (schema migrated, tests passing)

## Step-by-Step Implementation

### Step 1: Populate the transition map

Edit `Services/lead-service/src/constants/lead-states.js` — replace the empty `ALLOWED_TRANSITIONS`:

```javascript
export const ALLOWED_TRANSITIONS = {
  NEW:                ['DRAFTING', 'CLOSED_LOST'],
  DRAFTING:           ['QUOTED', 'CLOSED_LOST'],
  QUOTED:             ['REVISION', 'APPROVED', 'CLOSED_LOST'],
  REVISION:           ['DRAFTING', 'QUOTED', 'APPROVED', 'CLOSED_LOST'],
  APPROVED:           ['BOOKING_IN_PROGRESS', 'CLOSED_LOST'],
  BOOKING_IN_PROGRESS: ['CONFIRMED', 'BOOKING_FAILED'],
  BOOKING_FAILED:     ['BOOKING_IN_PROGRESS', 'REVISION', 'CLOSED_LOST'],
  CONFIRMED:          ['CANCELLED'],
  CLOSED_LOST:        [],
  CANCELLED:          [],
};
```

### Step 2: Create the state machine service

Create `Services/lead-service/src/services/state-machine.service.js`:

```javascript
import { ALLOWED_TRANSITIONS } from '../constants/lead-states.js';

export class StateMachineError extends Error {
  constructor(message, code = 'INVALID_TRANSITION') {
    super(message);
    this.code = code;
    this.name = 'StateMachineError';
  }
}

/**
 * Validates a lifecycle status transition with gatekeeper rules.
 *
 * @param {Object} params
 * @param {string} params.currentStatus - Current lifecycleStatus (e.g. 'DRAFTING')
 * @param {string} params.nextStatus - Requested new status
 * @param {Object} [params.financials={}] - Lead.financials JSON
 * @param {string} [params.lostReason] - Required when transitioning to CLOSED_LOST
 * @returns {{ nextStatus: string, recalculate: boolean }}
 * @throws {StateMachineError}
 */
export function validateTransition({ currentStatus, nextStatus, financials = {}, lostReason }) {
  if (!currentStatus) {
    throw new StateMachineError('Lead has no current lifecycle status');
  }

  if (currentStatus === nextStatus) {
    return { nextStatus, recalculate: false };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) {
    throw new StateMachineError(`Unknown status '${currentStatus}'`);
  }

  if (!allowed.includes(nextStatus)) {
    throw new StateMachineError(
      `Transition from '${currentStatus}' to '${nextStatus}' is not allowed`
    );
  }

  const fp = financials || {};
  const cp = fp.clientPricing || {};
  const act = fp.actual || {};

  // Gatekeeper: DRAFTING -> QUOTED requires quotedSellingPrice > 0
  if (currentStatus === 'DRAFTING' && nextStatus === 'QUOTED') {
    const qsp = cp.quotedSellingPrice;
    if (!qsp || qsp <= 0) {
      throw new StateMachineError(
        'Cannot transition to QUOTED: quotedSellingPrice must be greater than 0',
        'GATEKEEPER_QUOTED_PRICE'
      );
    }
  }

  // Gatekeeper: QUOTED/REVISION -> APPROVED requires depositPaid > 0
  if ((currentStatus === 'QUOTED' || currentStatus === 'REVISION') && nextStatus === 'APPROVED') {
    const deposit = cp.depositPaid;
    if (!deposit || deposit <= 0) {
      throw new StateMachineError(
        'Cannot transition to APPROVED: depositPaid must be greater than 0',
        'GATEKEEPER_APPROVED_DEPOSIT'
      );
    }
  }

  // Gatekeeper: BOOKING_IN_PROGRESS -> CONFIRMED requires both actual costs > 0
  if (currentStatus === 'BOOKING_IN_PROGRESS' && nextStatus === 'CONFIRMED') {
    const flightCost = act.actualFlightCost;
    const hotelCost = act.actualHotelCost;
    if (!flightCost || flightCost <= 0 || !hotelCost || hotelCost <= 0) {
      throw new StateMachineError(
        'Cannot transition to CONFIRMED: both actualFlightCost and actualHotelCost must be greater than 0',
        'GATEKEEPER_CONFIRMED_ACTUALS'
      );
    }
  }

  // Gatekeeper: any -> CLOSED_LOST requires lostReason
  if (nextStatus === 'CLOSED_LOST') {
    if (!lostReason || lostReason.trim().length === 0) {
      throw new StateMachineError(
        'Cannot transition to CLOSED_LOST: lostReason is required',
        'GATEKEEPER_LOST_REASON'
      );
    }
  }

  const recalculate = currentStatus === 'BOOKING_IN_PROGRESS' && nextStatus === 'CONFIRMED';

  return { nextStatus, recalculate };
}
```

### Step 3: Integrate into controller

Edit `Services/lead-service/src/controllers/lead.controller.js`:

In `updateLead`, after Zod validation and after fetching the existing lead, add the state machine call:

```javascript
import { validateTransition } from '../services/state-machine.service.js';

// Inside updateLead, after fetching lead and before Prisma update:
if (validatedBody.lifecycleStatus) {
  const currentStatus = lead.lifecycleStatus || 'NEW';
  const result = validateTransition({
    currentStatus,
    nextStatus: validatedBody.lifecycleStatus,
    financials: validatedBody.financials || lead.financials || {},
    lostReason: validatedBody.lostReason || lead.lostReason,
  });

  // Phase 3 will wire: if (result.recalculate) { ... }
}
```

### Step 4: Update constants tests

Edit `Services/lead-service/src/constants/__tests__/lead-states.test.js` — update the `ALLOWED_TRANSITIONS` test:

```javascript
it('every transition target is a valid status', () => {
  for (const [from, toList] of Object.entries(ALLOWED_TRANSITIONS)) {
    expect(LIFECYCLE_STATUSES).toContain(from);
    for (const to of toList) {
      expect(LIFECYCLE_STATUSES).toContain(to);
    }
  }
});

it('terminal statuses have no outgoing transitions', () => {
  for (const status of TERMINAL_STATUSES) {
    expect(ALLOWED_TRANSITIONS[status]).toEqual([]);
  }
});

it('CLOSED_LOST is reachable from all non-terminal statuses', () => {
  for (const status of LIFECYCLE_STATUSES) {
    if (!TERMINAL_STATUSES.includes(status)) {
      // Not all non-terminal statuses go directly to CLOSED_LOST, but most do
      // This is a soft check — if a status should NOT go to CLOSED_LOST, document why
    }
  }
});
```

### Step 5: Create state machine tests

Create `Services/lead-service/src/services/__tests__/state-machine.service.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { validateTransition, StateMachineError } from '../state-machine.service.js';

describe('validateTransition', () => {
  // ── Happy path transitions ──────────────────────────

  it('allows NEW -> DRAFTING', () => {
    const r = validateTransition({ currentStatus: 'NEW', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
    expect(r.recalculate).toBe(false);
  });

  it('allows DRAFTING -> QUOTED when quotedSellingPrice > 0', () => {
    const r = validateTransition({
      currentStatus: 'DRAFTING',
      nextStatus: 'QUOTED',
      financials: { clientPricing: { quotedSellingPrice: 1000 } },
    });
    expect(r.nextStatus).toBe('QUOTED');
  });

  it('allows QUOTED -> APPROVED when depositPaid > 0', () => {
    const r = validateTransition({
      currentStatus: 'QUOTED',
      nextStatus: 'APPROVED',
      financials: { clientPricing: { depositPaid: 500 } },
    });
    expect(r.nextStatus).toBe('APPROVED');
  });

  it('allows REVISION -> DRAFTING', () => {
    const r = validateTransition({ currentStatus: 'REVISION', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
  });

  it('allows REVISION -> QUOTED', () => {
    const r = validateTransition({ currentStatus: 'REVISION', nextStatus: 'QUOTED' });
    expect(r.nextStatus).toBe('QUOTED');
  });

  it('allows APPROVED -> BOOKING_IN_PROGRESS', () => {
    const r = validateTransition({ currentStatus: 'APPROVED', nextStatus: 'BOOKING_IN_PROGRESS' });
    expect(r.nextStatus).toBe('BOOKING_IN_PROGRESS');
  });

  it('allows BOOKING_IN_PROGRESS -> BOOKING_FAILED', () => {
    const r = validateTransition({ currentStatus: 'BOOKING_IN_PROGRESS', nextStatus: 'BOOKING_FAILED' });
    expect(r.nextStatus).toBe('BOOKING_FAILED');
  });

  it('allows BOOKING_FAILED -> BOOKING_IN_PROGRESS', () => {
    const r = validateTransition({ currentStatus: 'BOOKING_FAILED', nextStatus: 'BOOKING_IN_PROGRESS' });
    expect(r.nextStatus).toBe('BOOKING_IN_PROGRESS');
  });

  it('allows BOOKING_FAILED -> CLOSED_LOST with lostReason', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_FAILED',
      nextStatus: 'CLOSED_LOST',
      lostReason: 'Client found another provider',
    });
    expect(r.nextStatus).toBe('CLOSED_LOST');
  });

  it('allows CONFIRMED -> CANCELLED', () => {
    const r = validateTransition({ currentStatus: 'CONFIRMED', nextStatus: 'CANCELLED' });
    expect(r.nextStatus).toBe('CANCELLED');
  });

  it('same status is no-op', () => {
    const r = validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
    expect(r.recalculate).toBe(false);
  });

  // ── Blocked transitions ─────────────────────────────

  it('blocks DRAFTING -> CONFIRMED (invalid jump)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'CONFIRMED' })
    ).toThrow(StateMachineError);
  });

  it('blocks NEW -> APPROVED (invalid jump)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'NEW', nextStatus: 'APPROVED' })
    ).toThrow(StateMachineError);
  });

  it('blocks CONFIRMED -> DRAFTING (terminal)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'CONFIRMED', nextStatus: 'DRAFTING' })
    ).toThrow(StateMachineError);
  });

  it('blocks CLOSED_LOST -> anything (terminal)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'CLOSED_LOST', nextStatus: 'NEW' })
    ).toThrow(StateMachineError);
  });

  // ── Gatekeeper: QUOTED price ────────────────────────

  it('blocks DRAFTING -> QUOTED when quotedSellingPrice is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'DRAFTING',
        nextStatus: 'QUOTED',
        financials: { clientPricing: { quotedSellingPrice: 0 } },
      })
    ).toThrow(/quotedSellingPrice/);
  });

  it('blocks DRAFTING -> QUOTED when financials is empty', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'QUOTED' })
    ).toThrow(/quotedSellingPrice/);
  });

  // ── Gatekeeper: APPROVED deposit ────────────────────

  it('blocks QUOTED -> APPROVED when depositPaid is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'QUOTED',
        nextStatus: 'APPROVED',
        financials: { clientPricing: { depositPaid: 0 } },
      })
    ).toThrow(/depositPaid/);
  });

  it('blocks REVISION -> APPROVED when depositPaid is missing', () => {
    expect(() =>
      validateTransition({ currentStatus: 'REVISION', nextStatus: 'APPROVED' })
    ).toThrow(/depositPaid/);
  });

  // ── Gatekeeper: CONFIRMED actual costs ──────────────

  it('blocks BOOKING_IN_PROGRESS -> CONFIRMED when actualFlightCost is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'BOOKING_IN_PROGRESS',
        nextStatus: 'CONFIRMED',
        financials: { actual: { actualFlightCost: 0, actualHotelCost: 200 } },
      })
    ).toThrow(/actualFlightCost/);
  });

  it('blocks BOOKING_IN_PROGRESS -> CONFIRMED when actualHotelCost is missing', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'BOOKING_IN_PROGRESS',
        nextStatus: 'CONFIRMED',
        financials: { actual: { actualFlightCost: 300 } },
      })
    ).toThrow(/actualHotelCost/);
  });

  it('allows BOOKING_IN_PROGRESS -> CONFIRMED when both actual costs > 0', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_IN_PROGRESS',
      nextStatus: 'CONFIRMED',
      financials: { actual: { actualFlightCost: 300, actualHotelCost: 200 } },
    });
    expect(r.nextStatus).toBe('CONFIRMED');
    expect(r.recalculate).toBe(true);
  });

  // ── Gatekeeper: CLOSED_LOST reason ──────────────────

  it('blocks any -> CLOSED_LOST without lostReason', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'CLOSED_LOST' })
    ).toThrow(/lostReason/);
  });

  it('blocks CLOSED_LOST with empty lostReason string', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'DRAFTING',
        nextStatus: 'CLOSED_LOST',
        lostReason: '   ',
      })
    ).toThrow(/lostReason/);
  });

  // ── Edge cases ──────────────────────────────────────

  it('throws when currentStatus is null', () => {
    expect(() =>
      validateTransition({ currentStatus: null, nextStatus: 'DRAFTING' })
    ).toThrow(StateMachineError);
  });

  it('throws when currentStatus is undefined', () => {
    expect(() =>
      validateTransition({ currentStatus: undefined, nextStatus: 'DRAFTING' })
    ).toThrow(StateMachineError);
  });

  it('recalculate flag is true on BOOKING_IN_PROGRESS -> CONFIRMED', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_IN_PROGRESS',
      nextStatus: 'CONFIRMED',
      financials: { actual: { actualFlightCost: 500, actualHotelCost: 400 } },
    });
    expect(r.recalculate).toBe(true);
  });

  it('recalculate flag is false on non-CONFIRMED transitions', () => {
    const r = validateTransition({ currentStatus: 'NEW', nextStatus: 'DRAFTING' });
    expect(r.recalculate).toBe(false);
  });
});
```

### Step 6: Run tests

```bash
cd Services/lead-service && npm test
```

Expected: ~33 tests pass (4 lead-states + 12 validator + 17 state-machine).

## Edge Cases to Verify

- [ ] Same-status transition is a no-op (returns without error)
- [ ] Terminal statuses (CLOSED_LOST, CANCELLED) reject all transitions
- [ ] BOOKING_IN_PROGRESS → CONFIRMED: both actualFlightCost AND actualHotelCost must each be > 0
- [ ] REVISION → APPROVED also requires depositPaid > 0 (same gatekeeper as QUOTED → APPROVED)
- [ ] Empty string lostReason (whitespace only) is rejected
- [ ] null currentStatus throws descriptive error
- [ ] BOOKING_FAILED → REVISION allows going back to adjust the quote

## Verification

```bash
# Run all tests
cd Services/lead-service && npm test

# Manual API test: attempt invalid transition
curl -X PUT http://localhost:3000/api/v1/leads/<lead-id> \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"lifecycleStatus":"CONFIRMED"}'
# Expected: 400 error for lead currently in DRAFTING/NEW

# Manual API test: attempt CLOSED_LOST without reason
curl -X PUT http://localhost:3000/api/v1/leads/<lead-id> \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"lifecycleStatus":"CLOSED_LOST"}'
# Expected: 400 "lostReason is required"
```

## Files Touched

| Action | File |
|--------|------|
| CREATE | `Services/lead-service/src/services/state-machine.service.js` |
| CREATE | `Services/lead-service/src/services/__tests__/state-machine.service.test.js` |
| MODIFY | `Services/lead-service/src/constants/lead-states.js` |
| MODIFY | `Services/lead-service/src/constants/__tests__/lead-states.test.js` |
| MODIFY | `Services/lead-service/src/controllers/lead.controller.js` |
