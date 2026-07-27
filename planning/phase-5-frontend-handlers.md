# Phase 5: Frontend Dynamic Action Handlers

## Goal

Full Management UI upgrade to use the 10-state lifecycle everywhere, with conditional booking button rendering, pricing form integration, and gatekeeper-aware status selector.

## Prerequisites

- Phase 4 complete (micro-states working, PNR/supplier links rendering)

## Step-by-Step Implementation

### Step 1: Create LeadStatusBadge component

Create `Management/src/features/lead-management/components/LeadStatusBadge.jsx`:

```jsx
const LIFECYCLE_STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-700 border-blue-200',
  DRAFTING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  QUOTED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  REVISION: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BOOKING_IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED_LOST: 'bg-red-100 text-red-700 border-red-200',
  BOOKING_FAILED: 'bg-orange-100 text-orange-700 border-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const LIFECYCLE_STATUS_LABELS = {
  NEW: 'New',
  DRAFTING: 'Drafting',
  QUOTED: 'Quoted',
  REVISION: 'Revision',
  APPROVED: 'Approved',
  BOOKING_IN_PROGRESS: 'Booking in Progress',
  CONFIRMED: 'Confirmed',
  CLOSED_LOST: 'Closed Lost',
  BOOKING_FAILED: 'Booking Failed',
  CANCELLED: 'Cancelled',
};

export default function LeadStatusBadge({ status, className = '' }) {
  const color = LIFECYCLE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = LIFECYCLE_STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${className}`}>
      {label}
    </span>
  );
}

export { LIFECYCLE_STATUS_COLORS, LIFECYCLE_STATUS_LABELS };
```

### Step 2: Create PricingSection component

Create `Management/src/features/lead-management/components/PricingSection.jsx`:

This component renders:

- **Estimated Costs**: Inputs for `packageBaseCost`, `estimatedFlightCost`, `estimatedHotelCost`
- **Client Pricing**: Dropdown for `markupStrategy` (PERCENTAGE/FLAT_FEE), `markupValue` input, `depositPaid` input
- **Computed Display** (read-only):
  - Total Estimated Cost
  - Quoted Selling Price
  - Balance Due
- **Actual Costs** (shown only when lead has BOOKED items):
  - actualFlightCost, actualHotelCost
  - Total Actual Cost
  - Final Realized Profit
- **Calculate button**: calls `POST /api/v1/leads/:id/pricing/calculate`
- **Apply button**: calls `POST /api/v1/leads/:id/pricing/apply`

Key implementation pattern (React state management with the lead's financials):

```jsx
import { useState, useEffect } from 'react';
import api from '../../../services/api'; // or appropriate API import

export default function PricingSection({ leadId, financials: initialFinancials, onFinancialsUpdated }) {
  const [estimated, setEstimated] = useState({ packageBaseCost: 0, estimatedFlightCost: 0, estimatedHotelCost: 0 });
  const [clientPricing, setClientPricing] = useState({ markupStrategy: 'FLAT_FEE', markupValue: 0, depositPaid: 0 });
  const [computed, setComputed] = useState(null);
  const [actual, setActual] = useState({ actualFlightCost: null, actualHotelCost: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFinancials) {
      setEstimated(initialFinancials.estimated || { packageBaseCost: 0, estimatedFlightCost: 0, estimatedHotelCost: 0 });
      setClientPricing(initialFinancials.clientPricing || { markupStrategy: 'FLAT_FEE', markupValue: 0, depositPaid: 0 });
      setActual(initialFinancials.actual || { actualFlightCost: null, actualHotelCost: null });
      setComputed(initialFinancials);
    }
  }, [initialFinancials]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const financials = { estimated, clientPricing, actual };
      const res = await api.post(`/leads/${leadId}/pricing/calculate`, { financials });
      setComputed(res.data.data.financials);
    } catch (err) {
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const financials = { estimated, clientPricing, actual };
      const res = await api.post(`/leads/${leadId}/pricing/apply`, { financials });
      setComputed(res.data.data.financials);
      onFinancialsUpdated?.(res.data.data.financials);
    } catch (err) {
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Estimated Costs inputs */}
      <div>
        <h4 className="font-medium text-sm mb-2">Estimated Costs</h4>
        {/* Input fields for packageBaseCost, estimatedFlightCost, estimatedHotelCost */}
      </div>

      {/* Client Pricing inputs */}
      <div>
        <h4 className="font-medium text-sm mb-2">Client Pricing</h4>
        {/* Dropdown + inputs for markupStrategy, markupValue, depositPaid */}
      </div>

      {/* Computed Display */}
      {computed && (
        <div className="bg-gray-50 p-3 rounded">
          <div>Total Estimated: ${computed.estimated?.totalEstimatedCost}</div>
          <div>Quoted Price: ${computed.clientPricing?.quotedSellingPrice}</div>
          <div>Balance Due: ${computed.clientPricing?.balanceDue}</div>
          {computed.actual?.finalRealizedProfit != null && (
            <div>Profit: ${computed.actual.finalRealizedProfit}</div>
          )}
        </div>
      )}

      {/* Actual Costs (shown when lead has booked items) */}
      <div>
        <h4 className="font-medium text-sm mb-2">Actual Costs</h4>
        {/* Inputs for actualFlightCost, actualHotelCost */}
      </div>

      <div className="flex gap-2">
        <button onClick={handleCalculate} disabled={loading} className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm">
          Calculate
        </button>
        <button onClick={handleApply} disabled={loading} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">
          Apply
        </button>
      </div>
    </div>
  );
}
```

### Step 3: Update LeadManagement.jsx

Edit `Management/src/pages/LeadManagement.jsx`:

Replace all existing status color/label maps with the 10-state lifecycle versions. Import `LIFECYCLE_STATUS_COLORS` and `LIFECYCLE_STATUS_LABELS` from `LeadStatusBadge`.

Key change: when reading a lead's status for display, use `lead.lifecycleStatus ?? lead.status` to prefer the new field.

### Step 4: Update LeadFilters.jsx

Edit `Management/src/features/lead-management/components/LeadFilters.jsx`:

Update status filter tabs to use the 10 lifecycle states. Replace hardcoded old status values with `LIFECYCLE_STATUSES` from constants.

### Step 5: Update LeadTable.jsx

Edit `Management/src/features/lead-management/components/LeadTable.jsx`:

Replace the status badge rendering with `<LeadStatusBadge status={lead.lifecycleStatus ?? lead.status} />`.

### Step 6: Update StatusChangeDialog.jsx

Edit `Management/src/features/lead-management/components/StatusChangeDialog.jsx`:

This is the most critical frontend change. The dialog must:

1. **Show only allowed transitions** based on the current lifecycleStatus (mirror backend `ALLOWED_TRANSITIONS`):
```javascript
const ALLOWED_TRANSITIONS = {
  NEW: ['DRAFTING', 'CLOSED_LOST'],
  DRAFTING: ['QUOTED', 'CLOSED_LOST'],
  QUOTED: ['REVISION', 'APPROVED', 'CLOSED_LOST'],
  REVISION: ['DRAFTING', 'QUOTED', 'APPROVED', 'CLOSED_LOST'],
  APPROVED: ['BOOKING_IN_PROGRESS', 'CLOSED_LOST'],
  BOOKING_IN_PROGRESS: ['CONFIRMED', 'BOOKING_FAILED'],
  BOOKING_FAILED: ['BOOKING_IN_PROGRESS', 'REVISION', 'CLOSED_LOST'],
  CONFIRMED: ['CANCELLED'],
  CLOSED_LOST: [],
  CANCELLED: [],
};
```

2. **Add gatekeeper-aware tooltips**: Disable transitions that would fail and show why:
   - QUOTED disabled if `quotedSellingPrice <= 0` → "Set quoted selling price before quoting"
   - APPROVED disabled if `depositPaid <= 0` → "Record a deposit before approving"
   - CONFIRMED disabled if actual costs missing → "Enter actual flight and hotel costs first"
   - CLOSED_LOST requires text input → "Enter loss reason"

3. **Show lostReason textarea** when CLOSED_LOST is selected

4. **Show status transition info**: description of what each status means

```jsx
const LIFECYCLE_STATUS_INFO = {
  NEW: 'Fresh lead, not yet drafted',
  DRAFTING: 'Actively customizing itinerary and costs',
  QUOTED: 'Formal proposal sent to client',
  REVISION: 'Client requested changes to the quote',
  APPROVED: 'Client accepted terms, ready for live booking',
  BOOKING_IN_PROGRESS: 'Rep is securing live inventory',
  CONFIRMED: 'All inventory booked, invoice generated',
  CLOSED_LOST: 'Lead did not convert — reason required',
  BOOKING_FAILED: 'Booking attempt failed — needs intervention',
  CANCELLED: 'Cancelled after confirmation',
};
```

### Step 7: Update EditLeadDialog.jsx

Edit `Management/src/features/lead-management/components/EditLeadDialog.jsx`:

Add the following new sections (ordered as specified):

1. **Lifecycle Status selector**: Dropdown showing current status with valid next transitions
2. **Pricing section**: Import and render `<PricingSection leadId={lead.id} financials={lead.financials} onFinancialsUpdated={...} />`
3. **Booking sections** (already exist but now enhanced):
   - Flight section renders with micro-state badges (Phase 4)
   - Hotel section renders with micro-state badges (Phase 4)
   - Conditional booking buttons per micro-state (see table below)

#### Conditional Button Rendering Table

| Micro-State | Flight Button | Hotel Button |
|-------------|---------------|--------------|
| PENDING | "Set Preferences" — disabled, grayed out | "Select Hotel" — disabled, grayed out |
| READY_TO_BOOK | "Book Flight" — enabled, blue, opens FlightSelectionModal | "Book Now" — enabled, amber, opens HotelSelectionModal |
| BOOKED | "View PNR: {pnr}" + link to supplier portal | "View Confirmation: {pnrCode}" + link to supplier portal |
| FAILED | "Resolve Error" — enabled, red, with warning icon | "Resolve Error" — enabled, red, with warning icon |

### Step 8: Update NewLeadDialog.jsx

Edit `Management/src/features/lead-management/components/NewLeadDialog.jsx`:

Add `lifecycleStatus` to the initial payload (default to `'NEW'`). Add an optional lifecycle status dropdown if the user wants to create a lead at a specific stage.

### Step 9: Create API service for pricing

Add to the lead API service (whichever file handles lead API calls):

```javascript
export async function calculatePricing(leadId, financials) {
  return api.post(`/leads/${leadId}/pricing/calculate`, { financials });
}

export async function applyPricing(leadId, financials) {
  return api.post(`/leads/${leadId}/pricing/apply`, { financials });
}
```

## Verification (Manual UI Testing)

- [ ] **LeadManagement page**: Status badges show 10 lifecycle colors/labels correctly
- [ ] **Lead filters**: Status filter tabs show new lifecycle states
- [ ] **StatusChangeDialog**:
  - [ ] DRAFTING lead: only QUOTED and CLOSED_LOST are enabled destination states
  - [ ] CLOSED_LOST selection shows lost reason textarea
  - [ ] Submitting CLOSED_LOST without reason shows error
  - [ ] APPROVED is disabled with tooltip when depositPaid = 0
  - [ ] QUOTED is disabled with tooltip when quotedSellingPrice = 0
  - [ ] CONFIRMED is disabled with tooltip when actual costs missing
- [ ] **EditLeadDialog**:
  - [ ] Pricing section renders with Calculate/Apply buttons
  - [ ] Entering estimated costs and clicking Calculate shows computed values
  - [ ] Clicking Apply persists pricing to the lead
  - [ ] Lifecycle status selector reflects current state
- [ ] **Booking sections**:
  - [ ] PENDING items: buttons grayed out and disabled
  - [ ] READY_TO_BOOK items: booking buttons enabled
  - [ ] BOOKED items: PNR/confirmation code displayed with supplier portal link
  - [ ] FAILED items: red warning with "Resolve Error" button
- [ ] **NewLeadDialog**: creates lead with `lifecycleStatus: "NEW"` by default

## Files Touched

| Action | File |
|--------|------|
| CREATE | `Management/src/features/lead-management/components/PricingSection.jsx` |
| CREATE | `Management/src/features/lead-management/components/LeadStatusBadge.jsx` |
| MODIFY | `Management/src/pages/LeadManagement.jsx` |
| MODIFY | `Management/src/features/lead-management/components/LeadFilters.jsx` |
| MODIFY | `Management/src/features/lead-management/components/LeadTable.jsx` |
| MODIFY | `Management/src/features/lead-management/components/StatusChangeDialog.jsx` |
| MODIFY | `Management/src/features/lead-management/components/EditLeadDialog.jsx` |
| MODIFY | `Management/src/features/lead-management/components/NewLeadDialog.jsx` |
| MODIFY | API service file for lead endpoints |
