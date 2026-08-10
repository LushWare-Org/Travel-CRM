import { z } from 'zod';

// Names the two shapes currently conflated in lead-service's
// lead-package-selection.controller.js: quotePackageSelection historically
// returned the bare Prisma row (Raw), while listPackageSelections /
// getPackageSelection return the richer presentSelection()-wrapped shape
// (Summary). Deliberately loose on costLines/pricing — this package isn't
// modeling the full LeadPricing/cost-line shape in v1, only naming the two
// selection shapes so they can't be silently merged as if interchangeable.
export const LeadPackageSelectionRaw = z
  .object({
    id: z.string(),
    leadId: z.string(),
    packageId: z.string().nullable(),
    isManual: z.boolean(),
    packageName: z.string().nullable(),
    currentQuoteId: z.string().nullable(),
  })
  .passthrough();

export const LeadPackageSelectionSummary = LeadPackageSelectionRaw.extend({
  itineraryDays: z.array(z.any()),
  costLines: z.array(z.any()),
  pricing: z.any().nullable(),
  isMaterialized: z.boolean(),
  derivationError: z.boolean().optional(),
});

// The `data` payload of POST /leads/:id/packages/:selectionId/quote — the
// `selection` here must be the presented shape (see fix in
// lead-package-selection.controller.js's quotePackageSelection).
export const QuotePackageSelectionResult = z.object({
  selection: LeadPackageSelectionSummary,
  lead: z.any(),
  quotation: z.any(),
});
