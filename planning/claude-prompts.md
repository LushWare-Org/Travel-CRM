# Claude Prompts — Travel CRM Lead Lifecycle Implementation

Copy and paste the section for each phase into a new Claude session. Each prompt is self-contained and includes subagent instructions.

---

## Phase 1: Database Schema Migration + Zod Validation

```
Implement Phase 1 of the Travel CRM lead lifecycle upgrade.

## Context
We're upgrading the lead-service from a basic 7-state pipeline to a 10-state lifecycle with financial tracking. Phase 1 adds the new schema, Zod validation, and testing infrastructure WITHOUT changing existing behavior.

## Instructions

### 1. Use Explore subagent to read the current state of these files:
- Services/lead-service/prisma/schema.prisma (full file)
- Services/lead-service/src/controllers/lead.controller.js (full file)  
- Services/lead-service/src/index.js (full file)
- Services/lead-service/package.json (full file)
- Services/flight-service/vitest.config.js (to copy the test config pattern)

### 2. Make changes following the detailed guide at planning/phase-1-schema-validation.md

### 3. Key rules:
- The new `lifecycleStatus` field is nullable (backward compat) — existing leads keep their old `status`
- The new `financials` field is JSONB, defaults to `{}`
- All Zod schemas use `.strict()` to reject unknown fields
- Add `zod`, `pino`, `vitest`, `supertest` to package.json, then run `npm install`
- Run `npx prisma migrate dev --name add_lifecycle_status_and_financials` then `npx prisma generate`
- Add pino structured logger to index.js per CLAUDE.md logging conventions
- Follow CLAUDE.md: ES Modules, no console.log, structured JSON logging

### 4. After implementation, verify:
```
cd Services/lead-service && npm test
```

All ~16 tests must pass.

### 5. Use Agent tool (not Explore) for any follow-up investigation. Create each file with Write tool, modify with Edit tool.
```

---

## Phase 2: State Machine + Gatekeeper Logic

```
Implement Phase 2 of the Travel CRM lead lifecycle upgrade.

## Context
Phase 1 is complete — the lead-service now has `LeadLifecycleStatus` enum, `lifecycleStatus` field, `financials` field, Zod validation, and vitest. Phase 2 adds the state machine that enforces valid transitions and business gatekeeper rules.

## Instructions

### 1. Use Explore subagent to read these files first:
- Services/lead-service/src/constants/lead-states.js (full file)
- Services/lead-service/src/controllers/lead.controller.js (full file, focus on updateLead function)
- Services/lead-service/src/services/ (directory listing to check what exists)

### 2. Make changes following the detailed guide at planning/phase-2-state-machine.md

### 3. Key rules:
- The state machine service throws `StateMachineError` (custom class) with descriptive messages
- Gatekeeper codes: GATEKEEPER_QUOTED_PRICE, GATEKEEPER_APPROVED_DEPOSIT, GATEKEEPER_CONFIRMED_ACTUALS, GATEKEEPER_LOST_REASON
- Terminal statuses (CLOSED_LOST, CANCELLED) reject ALL transitions
- Same-status transition is a no-op (returns without error)
- The `recalculate` flag is true only for BOOKING_IN_PROGRESS -> CONFIRMED
- The lostReason gatekeeper rejects empty/whitespace-only strings
- Wire the state machine into `updateLead` — call it when `validatedBody.lifecycleStatus` is provided

### 4. After implementation, verify:
```
cd Services/lead-service && npm test
```

All ~33 tests must pass.

### 5. Use Agent tool for investigation, Write for new files, Edit for modifications.
```

---

## Phase 3: Pricing Engine

```
Implement Phase 3 of the Travel CRM lead lifecycle upgrade.

## Context
Phase 2 is complete — the state machine with gatekeeper rules is working. Phase 3 adds the pricing engine with 5 calculation rules, API endpoints, and auto-recalculation when transitioning BOOKING_IN_PROGRESS -> CONFIRMED.

## Instructions

### 1. Use Explore subagent to read these files first:
- Services/lead-service/src/services/state-machine.service.js (to understand recalculate flag)
- Services/lead-service/src/controllers/lead.controller.js (focus on updateLead, where recalculate should be wired)
- Services/lead-service/src/routes/lead.routes.js (to see where to mount pricing routes)
- Services/lead-service/src/index.js (to see route registration)

### 2. Make changes following the detailed guide at planning/phase-3-pricing-engine.md

### 3. Key rules:
- 5 calculation rules must be implemented as pure functions (no side effects, no DB access)
- `computeFinancials()` is the main entry point — always returns a complete financials object
- The `calculate` endpoint computes without persisting (dry-run)
- The `apply` endpoint computes AND persists to the lead
- `balanceDue` must never be negative — use `Math.max(0, ...)` 
- Pricing routes use `mergeParams: true` to access `:id` from parent route
- When state machine returns `recalculate: true`, merge existing financials with submitted ones, compute, and persist
- Follow CLAUDE.md: validate all API inputs, structured logging, ES Modules

### 4. After implementation, verify:
```
cd Services/lead-service && npm test
```

All ~53 tests must pass.

### 5. Test with curl:
```
# Calculate (dry-run)
curl -X POST http://localhost:3000/api/v1/leads/<lead-id>/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"financials":{"estimated":{"packageBaseCost":1000,"estimatedFlightCost":500,"estimatedHotelCost":300},"clientPricing":{"markupStrategy":"PERCENTAGE","markupValue":10}}}'

# Apply (persist)
curl -X POST http://localhost:3000/api/v1/leads/<lead-id>/pricing/apply \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"financials":{"estimated":{"packageBaseCost":1000,"estimatedFlightCost":500,"estimatedHotelCost":300},"clientPricing":{"markupStrategy":"FLAT_FEE","markupValue":200,"depositPaid":300}}}'
```
```

---

## Phase 4: Itinerary Item Micro-States + PNR/Booking Links

```
Implement Phase 4 of the Travel CRM lead lifecycle upgrade.

## Context
Phase 3 is complete — pricing engine working with API endpoints. Phase 4 adds micro-states (PENDING/READY_TO_BOOK/BOOKED/FAILED) to itinerary items, supplier portal URL and PNR code fields to booking models, and frontend micro-state badge display.

## Instructions

### 1. Use Explore subagent to read these files first:
- Services/lead-service/src/constants/item-states.js (will be created, but check if exists)
- Services/package-service/prisma/schema.prisma (HotelBooking model section)
- Services/flight-service/prisma/schema.prisma (FlightBooking model section)
- Management/src/features/lead-management/components/LeadFlightBookingsSection.jsx (full file)
- Management/src/features/lead-management/components/LeadHotelBookingsSection.jsx (full file)
- Management/src/features/lead-management/utils/ (directory listing to check existing utils)

### 2. Make changes following the detailed guide at planning/phase-4-microstates-pnr.md

### 3. Key rules:
- Micro-state derivation logic: FAILED > BOOKED > READY_TO_BOOK > PENDING (priority order)
- `deriveItemState()` is a pure function — no API calls, no side effects
- Flight model already has `pnr` field — only add `supplierPortalUrl`
- Hotel model needs both `pnrCode` AND `supplierPortalUrl`
- Both new fields are nullable (String?)
- Run `prisma migrate dev` for BOTH package-service and flight-service
- Frontend: use `lead.lifecycleStatus ?? lead.status` to get current status
- Frontend: show PNR and supplier portal link ONLY when itemState is BOOKED
- Frontend: show red warning ONLY when itemState is FAILED
- Follow CLAUDE.md: validate all inputs, structured logging, ES Modules

### 4. After implementation, verify:
```
cd Services/lead-service && npm test
```

All ~63 tests must pass.

### 5. Manual verification:
```
cd Management && npm run dev
# Navigate to Lead Management
# Open lead in APPROVED status → verify "Ready to Book" badges
# Open lead in DRAFTING status → verify "Pending" badges
```
```

---

## Phase 5: Frontend Dynamic Action Handlers

```
Implement Phase 5 of the Travel CRM lead lifecycle upgrade.

## Context
Phase 4 is complete — micro-states and PNR links working. Phase 5 is the full Management UI upgrade: 10-state lifecycle everywhere, conditional booking buttons, pricing form integration, and gatekeeper-aware status selector.

## Instructions

### 1. Use Explore subagent to read these files first (ALL full files):
- Management/src/pages/LeadManagement.jsx (full file — all status colors, labels, status change flow)
- Management/src/features/lead-management/components/LeadFilters.jsx (full file)
- Management/src/features/lead-management/components/LeadTable.jsx (full file)
- Management/src/features/lead-management/components/StatusChangeDialog.jsx (full file)
- Management/src/features/lead-management/components/EditLeadDialog.jsx (full file — especially where booking sections render)
- Management/src/features/lead-management/components/NewLeadDialog.jsx (full file)
- Management/src/services/ (directory listing — find the lead API service file)
- Management/src/features/lead-management/utils/bookingState.js (to understand existing micro-state helpers)

### 2. Then use a second Explore subagent to understand the component structure:
- Search for all files that reference the old status enum values ("new", "contacted", "interested", "quoted", "converted", "lost", "not_interested")
- Search for all files that reference "statusColors" or "statusLabels"
- Check if there are any other pages (besides LeadManagement) that render lead status

### 3. Make changes following the detailed guide at planning/phase-5-frontend-handlers.md

### 4. Key rules:
- ALWAYS use `lead.lifecycleStatus ?? lead.status` when reading status for display
- NEVER remove old status support — the old `status` field still exists
- The StatusChangeDialog must mirror the backend ALLOWED_TRANSITIONS map exactly
- Gatekeeper-aware tooltips must explain WHY a transition is disabled
- CLOSED_LOST requires a lostReason textarea that appears conditionally
- PricingSection must call the /calculate endpoint first (dry-run), then /apply (persist)
- Booking buttons render conditionally per the micro-state table in the guide
- Follow CLAUDE.md: structured logging, no console.log in production code
- All new components must use ES Modules (import/export)

### 5. After implementation, verify manually:
```
cd Management && npm run dev
```
- LeadManagement page: all 10 status badges render with correct colors
- Filters: status filter tabs show lifecycle states
- StatusChangeDialog: only valid transitions enabled, CLOSED_LOST shows reason field
- EditLeadDialog: Pricing section works (enter costs → Calculate → see computed → Apply)
- Booking sections: buttons render per micro-state
- NewLeadDialog: creates lead with lifecycleStatus: "NEW"

### 6. Use Agent tool (not Explore) for follow-up investigation during implementation.
```

---

## How to Use These Prompts

1. Start a **new Claude session** for each phase
2. Paste the entire phase prompt into the chat
3. Claude will use Explore subagents to read the current state, then implement changes
4. After implementation, run the verification commands listed in each prompt
5. The phase guide files in `planning/` contain the full technical details — Claude can reference them at `planning/phase-N-*.md`
6. Each phase builds on the previous — do NOT skip phases
7. If a phase fails tests, fix issues before moving to the next phase
