import { z } from 'zod';

// ── Lead lifecycle status ───────────────────────────────────────

const lifecycleStatusEnum = z.enum([
  'NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED',
  'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST',
  'BOOKING_FAILED', 'CANCELLED',
]);

// ── Shared lead fields (contact/travel/assignment — package/itinerary/
// pricing state lives on LeadPackageSelection, not on the Lead itself) ─────

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
  date: z.string().optional(), // date-only (YYYY-MM-DD) or full ISO; parsed by the service
  addedBy: z.string().optional(),
})).optional();

// ── Schemas ─────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  ...leadFields,
  remarks: remarksSchema,
  // A lead is created with at most one initial package selection — both
  // optional (a bare contact-form-style lead may have neither yet).
  packageId: z.string().uuid().optional().nullable(),
  packageName: z.string().optional().nullable(),
  isManualItinerary: z.boolean().optional(),
}).strict();

export const updateLeadSchema = z.object({
  ...leadFields,
  remarks: remarksSchema,
}).strict();

// ── Per-package selections (LeadPackageSelection) ────────────────

export const createPackageSelectionSchema = z.object({
  packageId: z.string().uuid().optional(),
  isManual: z.boolean().optional(),
}).strict().refine(
  (v) => Boolean(v.packageId) !== Boolean(v.isManual),
  { message: 'Exactly one of packageId or isManual is required' },
);

// ── Optional transfer flights (LeadOptionalFlight) ───────────────

export const addOptionalFlightSchema = z.object({
  flightType: z.enum(['TO_START', 'RETURN_HOME']),
  origin: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  cabinClass: z.string().optional().nullable(),
  departureTime: z.string().optional().nullable(),
  airlinePreference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  estimatedUnitPrice: z.number().min(0).optional(),
  actualUnitPrice: z.number().min(0).optional().nullable(),
  marginType: z.enum(['PERCENTAGE', 'FIXED']).nullable().optional(),
  marginValue: z.number().min(0).nullable().optional(),
}).strict();
