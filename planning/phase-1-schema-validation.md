# Phase 1: Database Schema Migration + Zod Validation

## Goal

Add the new `LeadLifecycleStatus` enum, `lifecycleStatus` field, and `financials` JSONB field to the Lead model. Add Zod input validation to all lead endpoints. Add structured logging via pino. Set up vitest testing infrastructure. **Zero behavior change to existing functionality.**

## Prerequisites

- PostgreSQL running
- Lead service dependencies installed (`cd Services/lead-service && npm install`)

## Step-by-Step Implementation

### Step 1: Add dependencies

Edit `Services/lead-service/package.json`:

```json
"dependencies": {
  "pino": "^9.0.0",
  "zod": "^3.23.0"
},
"devDependencies": {
  "vitest": "^4.1.0",
  "supertest": "^7.2.0"
}
```

Run `cd Services/lead-service && npm install`.

### Step 2: Create vitest config

Create `Services/lead-service/vitest.config.js` following the pattern from `Services/flight-service/vitest.config.js`.

### Step 3: Add schema changes

Edit `Services/lead-service/prisma/schema.prisma`:

1. Add the new enum BEFORE the Lead model:

```prisma
enum LeadLifecycleStatus {
  NEW
  DRAFTING
  QUOTED
  REVISION
  APPROVED
  BOOKING_IN_PROGRESS
  CONFIRMED
  CLOSED_LOST
  BOOKING_FAILED
  CANCELLED

  @@schema("crm_leads")
}
```

2. Add two new fields to the `Lead` model (after the existing `status` field, around line 127):

```prisma
  lifecycleStatus  LeadLifecycleStatus?
  financials       Json?                  @default("{}")
```

3. Run migration:

```bash
cd Services/lead-service && npx prisma migrate dev --name add_lifecycle_status_and_financials
npx prisma generate
```

### Step 4: Create state constants

Create `Services/lead-service/src/constants/lead-states.js`:

```javascript
export const LIFECYCLE_STATUSES = [
  'NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED',
  'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST',
  'BOOKING_FAILED', 'CANCELLED',
];

// Populated in Phase 2
export const ALLOWED_TRANSITIONS = {};

export const TERMINAL_STATUSES = ['CLOSED_LOST', 'CANCELLED'];

export const REQUIRES_LOST_REASON = ['CLOSED_LOST'];
```

### Step 5: Create Zod validation schemas

Create `Services/lead-service/src/validators/lead.validator.js`:

```javascript
import { z } from 'zod';

const estimatedSchema = z.object({
  packageBaseCost: z.number().min(0).default(0),
  estimatedFlightCost: z.number().min(0).default(0),
  estimatedHotelCost: z.number().min(0).default(0),
  totalEstimatedCost: z.number().min(0).optional(),
}).strict();

const clientPricingSchema = z.object({
  markupStrategy: z.enum(['PERCENTAGE', 'FLAT_FEE']).optional(),
  markupValue: z.number().min(0).default(0),
  quotedSellingPrice: z.number().min(0).optional(),
  depositPaid: z.number().min(0).default(0),
  balanceDue: z.number().optional(),
}).strict();

const actualSchema = z.object({
  actualFlightCost: z.number().min(0).nullable().optional(),
  actualHotelCost: z.number().min(0).nullable().optional(),
  totalActualCost: z.number().min(0).nullable().optional(),
  finalRealizedProfit: z.number().nullable().optional(),
}).strict();

const financialsSchema = z.object({
  estimated: estimatedSchema.optional().default({}),
  clientPricing: clientPricingSchema.optional().default({}),
  actual: actualSchema.optional().default({}),
}).strict();

const lifecycleStatusEnum = z.enum([
  'NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED',
  'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST',
  'BOOKING_FAILED', 'CANCELLED',
]);

export const createLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().optional(),
  platform: z.string().optional(),
  fromCountry: z.string().optional().nullable(),
  destinationCountry: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  travelDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  packageId: z.string().uuid().optional().nullable(),
  packageName: z.string().optional().nullable(),
  numberOfTravelers: z.number().int().min(1).optional(),
  budget: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  status: z.string().optional(),
  lifecycleStatus: lifecycleStatusEnum.optional(),
  financials: financialsSchema.optional(),
  priority: z.string().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional().nullable(),
}).strict();

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().optional(),
  platform: z.string().optional(),
  fromCountry: z.string().optional().nullable(),
  destinationCountry: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  travelDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  packageId: z.string().uuid().optional().nullable(),
  packageName: z.string().optional().nullable(),
  numberOfTravelers: z.number().int().min(1).optional(),
  budget: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  status: z.string().optional(),
  lifecycleStatus: lifecycleStatusEnum.optional(),
  financials: financialsSchema.optional(),
  priority: z.string().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional().nullable(),
  statusChangeNotes: z.string().optional().nullable(),
}).strict();
```

### Step 6: Add Zod validation to controller

Edit `Services/lead-service/src/controllers/lead.controller.js`:

In `createLead` (after destructuring `req.body`, before Prisma create):

```javascript
import { createLeadSchema } from '../validators/lead.validator.js';

// At top of createLead:
const parsed = createLeadSchema.safeParse(body);
if (!parsed.success) {
  const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  throw new AppError(messages, 400);
}
const validatedBody = parsed.data;
// Use validatedBody instead of body for all fields
```

In `updateLead`:

```javascript
import { updateLeadSchema } from '../validators/lead.validator.js';

// At top of updateLead:
const parsed = updateLeadSchema.safeParse(req.body);
if (!parsed.success) {
  const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  throw new AppError(messages, 400);
}
const validatedBody = parsed.data;
// Use validatedBody instead of req.body
```

When creating the lead, also set `lifecycleStatus` and `financials` if provided in `validatedBody`:

```javascript
// In the prisma.lead.create data object, add:
lifecycleStatus: validatedBody.lifecycleStatus || null,
financials: validatedBody.financials || {},
```

When updating, do the same:

```javascript
// In updateData (the object passed to prisma.lead.update), conditionally add:
if (validatedBody.lifecycleStatus !== undefined) {
  updateData.lifecycleStatus = validatedBody.lifecycleStatus;
}
if (validatedBody.financials !== undefined) {
  updateData.financials = validatedBody.financials;
}
```

### Step 7: Add pino logger

Edit `Services/lead-service/src/index.js`:

```javascript
import pino from 'pino';

const logger = pino({
  name: 'lead-service',
  level: process.env.LOG_LEVEL || 'info',
});

// Replace console.log with logger.info, logger.error, etc.
// Add requestId to logs: logger.info({ requestId: req.headers['x-request-id'] }, 'message');
```

### Step 8: Create tests

Create `Services/lead-service/src/constants/__tests__/lead-states.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { LIFECYCLE_STATUSES, TERMINAL_STATUSES, REQUIRES_LOST_REASON, ALLOWED_TRANSITIONS } from '../lead-states.js';

describe('lead-states constants', () => {
  it('LIFECYCLE_STATUSES has exactly 10 entries', () => {
    expect(LIFECYCLE_STATUSES).toHaveLength(10);
  });

  it('LIFECYCLE_STATUSES contains all expected values', () => {
    expect(LIFECYCLE_STATUSES).toContain('NEW');
    expect(LIFECYCLE_STATUSES).toContain('DRAFTING');
    expect(LIFECYCLE_STATUSES).toContain('QUOTED');
    expect(LIFECYCLE_STATUSES).toContain('REVISION');
    expect(LIFECYCLE_STATUSES).toContain('APPROVED');
    expect(LIFECYCLE_STATUSES).toContain('BOOKING_IN_PROGRESS');
    expect(LIFECYCLE_STATUSES).toContain('CONFIRMED');
    expect(LIFECYCLE_STATUSES).toContain('CLOSED_LOST');
    expect(LIFECYCLE_STATUSES).toContain('BOOKING_FAILED');
    expect(LIFECYCLE_STATUSES).toContain('CANCELLED');
  });

  it('TERMINAL_STATUSES includes CLOSED_LOST, CANCELLED', () => {
    expect(TERMINAL_STATUSES).toContain('CLOSED_LOST');
    expect(TERMINAL_STATUSES).toContain('CANCELLED');
    expect(TERMINAL_STATUSES).toHaveLength(2);
  });

  it('REQUIRES_LOST_REASON includes CLOSED_LOST', () => {
    expect(REQUIRES_LOST_REASON).toContain('CLOSED_LOST');
  });

  it('ALLOWED_TRANSITIONS is an empty object (Phase 1 placeholder)', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({});
  });
});
```

Create `Services/lead-service/src/validators/__tests__/lead.validator.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../lead.validator.js';

describe('createLeadSchema', () => {
  it('accepts valid full payload', () => {
    const result = createLeadSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      lifecycleStatus: 'NEW',
      financials: {
        estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 },
        clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 10 },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty body (all fields optional)', () => {
    const result = createLeadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createLeadSchema.safeParse({ email: 'notanemail' });
    expect(result.success).toBe(false);
  });

  it('rejects negative numberOfTravelers', () => {
    const result = createLeadSchema.safeParse({ numberOfTravelers: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid for packageId', () => {
    const result = createLeadSchema.safeParse({ packageId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown lifecycleStatus', () => {
    const result = createLeadSchema.safeParse({ lifecycleStatus: 'BOGUS' });
    expect(result.success).toBe(false);
  });

  it('accepts each valid lifecycleStatus', () => {
    const valid = ['NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED', 'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST', 'BOOKING_FAILED', 'CANCELLED'];
    for (const status of valid) {
      const result = createLeadSchema.safeParse({ lifecycleStatus: status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects negative packageBaseCost in financials', () => {
    const result = createLeadSchema.safeParse({
      financials: { estimated: { packageBaseCost: -100 } },
    });
    expect(result.success).toBe(false);
  });

  it('accepts financials with only estimated fields', () => {
    const result = createLeadSchema.safeParse({
      financials: { estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown markupStrategy', () => {
    const result = createLeadSchema.safeParse({
      financials: { clientPricing: { markupStrategy: 'INVALID' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative depositPaid', () => {
    const result = createLeadSchema.safeParse({
      financials: { clientPricing: { depositPaid: -50 } },
    });
    expect(result.success).toBe(false);
  });
});

describe('updateLeadSchema', () => {
  it('accepts partial update', () => {
    const result = updateLeadSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty body', () => {
    const result = updateLeadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts statusChangeNotes', () => {
    const result = updateLeadSchema.safeParse({ lifecycleStatus: 'QUOTED', statusChangeNotes: 'Sent proposal' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields', () => {
    const result = updateLeadSchema.safeParse({ bogusField: 'value' });
    expect(result.success).toBe(false);
  });
});
```

### Step 9: Run tests

```bash
cd Services/lead-service && npm test
```

Expected: all tests pass (4 lead-states tests + 12+ validator tests).

## Edge Cases to Verify

- [ ] Empty body in createLead — passes (all fields optional)
- [ ] Invalid email format — rejected with clear error
- [ ] Negative numbers in financial fields — rejected
- [ ] Unknown enum values — rejected
- [ ] Invalid UUIDs — rejected
- [ ] Unknown top-level fields — rejected (strict mode)
- [ ] Existing leads still query correctly (lifecycleStatus is null for old records)

## Verification

```bash
# Run all tests
cd Services/lead-service && npm test

# Manual API test: create lead with lifecycleStatus
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"name":"Phase 1 Test Lead","lifecycleStatus":"DRAFTING","financials":{"estimated":{"packageBaseCost":1000}}}'

# Manual API test: verify bad data is rejected
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -H "x-user-role: admin" \
  -d '{"lifecycleStatus":"BOGUS"}'
# Expected: 400 with validation error message
```

## Files Touched

| Action | File |
|--------|------|
| CREATE | `Services/lead-service/vitest.config.js` |
| CREATE | `Services/lead-service/src/validators/lead.validator.js` |
| CREATE | `Services/lead-service/src/validators/__tests__/lead.validator.test.js` |
| CREATE | `Services/lead-service/src/constants/lead-states.js` |
| CREATE | `Services/lead-service/src/constants/__tests__/lead-states.test.js` |
| MODIFY | `Services/lead-service/prisma/schema.prisma` |
| MODIFY | `Services/lead-service/package.json` |
| MODIFY | `Services/lead-service/src/controllers/lead.controller.js` |
| MODIFY | `Services/lead-service/src/index.js` |
