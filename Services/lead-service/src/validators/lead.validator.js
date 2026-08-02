import { z } from 'zod';

// ── Lead lifecycle status ───────────────────────────────────────

const lifecycleStatusEnum = z.enum([
  'NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED',
  'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST',
  'BOOKING_FAILED', 'CANCELLED',
]);

// ── Pricing settings (LeadPricing fields) ───────────────────────

const pricingSchema = z.object({
  currency: z.string().length(3).optional(),
  marginType: z.enum(['PERCENTAGE', 'FIXED']).nullable().optional(),
  marginValue: z.number().min(0).nullable().optional(),
  depositType: z.enum(['PERCENTAGE', 'FIXED']).nullable().optional(),
  depositValue: z.number().min(0).nullable().optional(),
  discountType: z.enum(['none', 'percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  serviceChargeRate: z.number().min(0).optional(),
}).strict();

// ── Shared lead fields ──────────────────────────────────────────

const leadFields = {
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
  lifecycleStatus: lifecycleStatusEnum.optional(),
  priority: z.string().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional().nullable(),
  statusChangeNotes: z.string().optional().nullable(),
};

const remarksSchema = z.array(z.object({
  text: z.string().min(1),
  date: z.string().datetime().optional(),
  addedBy: z.string().optional(),
})).optional();

// ── Schemas ─────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  ...leadFields,
  remarks: remarksSchema,
}).strict();

export const updateLeadSchema = z.object({
  ...leadFields,
  remarks: remarksSchema,
  pricing: pricingSchema.optional(),
}).strict();
