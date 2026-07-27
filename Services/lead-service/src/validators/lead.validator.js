import { z } from 'zod';

// ── Financials sub-schemas ──────────────────────────────────────

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

// ── Lead lifecycle status ───────────────────────────────────────

const lifecycleStatusEnum = z.enum([
  'NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED',
  'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST',
  'BOOKING_FAILED', 'CANCELLED',
]);

// ── Create lead schema ──────────────────────────────────────────

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
  travelDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
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
  remarks: z.array(z.object({
    text: z.string().optional(),
    date: z.string().datetime().optional(),
    addedBy: z.string().optional(),
  })).optional(),
  statusChangeNotes: z.string().optional().nullable(),
}).strict();

// ── Update lead schema ──────────────────────────────────────────

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
  travelDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
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
