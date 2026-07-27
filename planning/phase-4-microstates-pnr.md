# Phase 4: Itinerary Item Micro-States + PNR/Booking Links

## Goal

Add micro-states (PENDING, READY_TO_BOOK, BOOKED, FAILED) to itinerary items, add `supplierPortalUrl` and `pnrCode` fields to HotelBooking and FlightBooking, and wire frontend micro-state badge display.

## Prerequisites

- Phase 3 complete (pricing engine working)
- Flight service and Package service running

## Step-by-Step Implementation

### Step 1: Create item micro-state constants

Create `Services/lead-service/src/constants/item-states.js`:

```javascript
export const ITEM_BOOKING_STATES = ['PENDING', 'READY_TO_BOOK', 'BOOKED', 'FAILED'];

export const ITEM_STATE_LABELS = {
  PENDING: 'Pending',
  READY_TO_BOOK: 'Ready to Book',
  BOOKED: 'Booked',
  FAILED: 'Failed',
};

export const ITEM_STATE_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  READY_TO_BOOK: 'bg-blue-100 text-blue-700',
  BOOKED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

/**
 * Derive the micro-state for an itinerary item based on lead lifecycle status
 * and whether bookings exist for that item.
 *
 * @param {string} leadLifecycleStatus - The lead's current lifecycleStatus
 * @param {boolean} hasBooking - Whether a confirmed booking exists for this item
 * @param {boolean} hasFailed - Whether any booking attempt failed for this item
 * @returns {string} One of: PENDING, READY_TO_BOOK, BOOKED, FAILED
 */
export function deriveItemState(leadLifecycleStatus, hasBooking = false, hasFailed = false) {
  if (hasFailed) return 'FAILED';
  if (hasBooking) return 'BOOKED';
  if (leadLifecycleStatus === 'APPROVED' || leadLifecycleStatus === 'BOOKING_IN_PROGRESS') {
    return 'READY_TO_BOOK';
  }
  return 'PENDING';
}
```

### Step 2: Create item-states tests

Create `Services/lead-service/src/constants/__tests__/item-states.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { ITEM_BOOKING_STATES, deriveItemState } from '../item-states.js';

describe('ITEM_BOOKING_STATES', () => {
  it('has exactly 4 values', () => {
    expect(ITEM_BOOKING_STATES).toHaveLength(4);
  });

  it('contains expected values', () => {
    expect(ITEM_BOOKING_STATES).toContain('PENDING');
    expect(ITEM_BOOKING_STATES).toContain('READY_TO_BOOK');
    expect(ITEM_BOOKING_STATES).toContain('BOOKED');
    expect(ITEM_BOOKING_STATES).toContain('FAILED');
  });
});

describe('deriveItemState', () => {
  it('returns PENDING when lead is DRAFTING and no booking', () => {
    expect(deriveItemState('DRAFTING', false, false)).toBe('PENDING');
  });

  it('returns PENDING when lead is NEW', () => {
    expect(deriveItemState('NEW', false, false)).toBe('PENDING');
  });

  it('returns PENDING when lead is QUOTED', () => {
    expect(deriveItemState('QUOTED', false, false)).toBe('PENDING');
  });

  it('returns READY_TO_BOOK when lead is APPROVED and no booking', () => {
    expect(deriveItemState('APPROVED', false, false)).toBe('READY_TO_BOOK');
  });

  it('returns READY_TO_BOOK when lead is BOOKING_IN_PROGRESS and no booking', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', false, false)).toBe('READY_TO_BOOK');
  });

  it('returns BOOKED when booking exists', () => {
    expect(deriveItemState('APPROVED', true, false)).toBe('BOOKED');
  });

  it('returns BOOKED even when lead is DRAFTING (booking already made)', () => {
    expect(deriveItemState('DRAFTING', true, false)).toBe('BOOKED');
  });

  it('returns FAILED when booking failed, regardless of lead status', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', false, true)).toBe('FAILED');
  });

  it('prioritizes FAILED over BOOKED when both are true', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', true, true)).toBe('FAILED');
  });

  it('returns PENDING when lead status is CLOSED_LOST', () => {
    expect(deriveItemState('CLOSED_LOST', false, false)).toBe('PENDING');
  });
});
```

### Step 3: Add schema fields to HotelBooking

Edit `Services/package-service/prisma/schema.prisma` — add to HotelBooking model:

```prisma
model HotelBooking {
  // ... existing fields ...

  supplierPortalUrl  String?
  pnrCode            String?

  // ... rest unchanged ...
}
```

Run migration:

```bash
cd Services/package-service && npx prisma migrate dev --name add_booking_reference_fields
npx prisma generate
```

### Step 4: Add schema fields to FlightBooking

Edit `Services/flight-service/prisma/schema.prisma` — add to FlightBooking model (note: it already has `pnr`):

```prisma
model FlightBooking {
  // ... existing fields (pnr already exists) ...

  supplierPortalUrl  String?

  // ... rest unchanged ...
}
```

Run migration:

```bash
cd Services/flight-service && npx prisma migrate dev --name add_supplier_portal_url
npx prisma generate
```

### Step 5: Create frontend booking state utility

Create `Management/src/features/lead-management/utils/bookingState.js`:

```javascript
export const ITEM_BOOKING_STATES = ['PENDING', 'READY_TO_BOOK', 'BOOKED', 'FAILED'];

export const ITEM_STATE_LABELS = {
  PENDING: 'Pending',
  READY_TO_BOOK: 'Ready to Book',
  BOOKED: 'Booked',
  FAILED: 'Failed',
};

export const ITEM_STATE_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  READY_TO_BOOK: 'bg-blue-100 text-blue-700 border-blue-200',
  BOOKED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

/**
 * @param {string} leadLifecycleStatus
 * @param {boolean} hasBooking
 * @param {boolean} hasFailed
 * @returns {'PENDING'|'READY_TO_BOOK'|'BOOKED'|'FAILED'}
 */
export function deriveItemState(leadLifecycleStatus, hasBooking = false, hasFailed = false) {
  if (hasFailed) return 'FAILED';
  if (hasBooking) return 'BOOKED';
  if (leadLifecycleStatus === 'APPROVED' || leadLifecycleStatus === 'BOOKING_IN_PROGRESS') {
    return 'READY_TO_BOOK';
  }
  return 'PENDING';
}
```

### Step 6: Update LeadFlightBookingsSection

Edit `Management/src/features/lead-management/components/LeadFlightBookingsSection.jsx`:

1. Import `deriveItemState`, `ITEM_STATE_LABELS`, `ITEM_STATE_COLORS` from `../utils/bookingState`
2. For each day item, compute `itemState` using the lead's `lifecycleStatus` (falling back to `status`)
3. Add a colored badge showing the micro-state label next to each day
4. When `BOOKED`, show PNR and supplier portal link:

```jsx
{itemState === 'BOOKED' && flight?.pnr && (
  <div className="mt-1 text-xs">
    <span className="font-mono text-gray-700">PNR: {flight.pnr}</span>
    {flight.supplierPortalUrl && (
      <a href={flight.supplierPortalUrl} target="_blank" rel="noopener noreferrer"
         className="ml-2 text-blue-600 underline">
        Open Supplier Portal
      </a>
    )}
  </div>
)}
{itemState === 'FAILED' && (
  <div className="mt-1 text-xs text-red-600 font-medium">
    Booking failed — manual intervention required
  </div>
)}
```

### Step 7: Update LeadHotelBookingsSection

Edit `Management/src/features/lead-management/components/LeadHotelBookingsSection.jsx`:

Same pattern as flights:
1. Import booking state utilities
2. Compute `itemState` per day
3. Show micro-state badge
4. When `BOOKED`, show `pnrCode` and `supplierPortalUrl`
5. When `FAILED`, show red warning

### Step 8: Run tests

```bash
cd Services/lead-service && npm test
```

Expected: ~63 tests pass (4 lead-states + 12 validator + 17 state-machine + 20 pricing + 10 item-states).

## Edge Cases to Verify

- [ ] All lead statuses produce correct item states (test each of the 10 statuses)
- [ ] FAILED takes priority over BOOKED when both conditions true
- [ ] CLOSED_LOST and CANCELLED leads show PENDING for all items
- [ ] NEW leads show PENDING
- [ ] PNR/supplierPortalUrl only displayed when BOOKED
- [ ] Missing pnrCode — gracefully handled (no crash)

## Verification

```bash
# Backend tests
cd Services/lead-service && npm test

# Manual: Start Management UI
cd Management && npm run dev

# Navigate to Lead Management
# Open a lead that's in APPROVED or BOOKING_IN_PROGRESS status
# Verify itinerary items show "Ready to Book" badge (blue)
# Open a lead in DRAFTING
# Verify items show "Pending" badge (gray)

# Manual API: test supplierPortalUrl on hotel booking
curl -X POST http://localhost:3000/api/v1/hotels/book-with-context \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"leadId":"<lead-id>","dayNumber":1,"supplierPortalUrl":"https://supplier.example.com/booking/ABC","pnrCode":"H123456"}'
```

## Files Touched

| Action | File |
|--------|------|
| CREATE | `Services/lead-service/src/constants/item-states.js` |
| CREATE | `Services/lead-service/src/constants/__tests__/item-states.test.js` |
| CREATE | `Management/src/features/lead-management/utils/bookingState.js` |
| MODIFY | `Services/package-service/prisma/schema.prisma` |
| MODIFY | `Services/flight-service/prisma/schema.prisma` |
| MODIFY | `Management/src/features/lead-management/components/LeadFlightBookingsSection.jsx` |
| MODIFY | `Management/src/features/lead-management/components/LeadHotelBookingsSection.jsx` |
