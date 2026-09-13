import { z } from 'zod';
import { moneyField } from './money.js';
import { ItineraryDay } from './itineraryDay.js';

// Narrow schema for the fields billing-service's generateQuotationPDF
// (Services/billing-service/src/utils/quotationPDFGenerator.js) actually
// dereferences off a persisted Quotation row. Deliberately not the same
// schema as LeadSnapshotForQuotation: this reads a row *after*
// createOrVersionQuotation, which has extra fields (advisorName, mode,
// computed totals) and is missing snapshot-only fields (leadId, createdById).
// .passthrough() so unrelated Quotation columns aren't rejected.
export const QuotationForPdf = z
  .object({
    currency: z.string().nullable().optional(),
    items: z
      .array(
        z
          .object({
            category: z.string().nullable().optional(),
            totalPrice: moneyField.optional(),
          })
          .passthrough(),
      )
      .optional(),
    // itineraryDays is a Json? column: tolerated by the generator as an
    // array, a stringified array, or null (see normalizeDays()).
    itineraryDays: z.union([z.array(ItineraryDay), z.string(), z.null()]).optional(),
    highlights: z.array(z.string()).nullable().optional(),
    destination: z.string().nullable().optional(),
    packageTitle: z.string().nullable().optional(),
    travelStartDate: z.coerce.date().nullable().optional(),
    travelEndDate: z.coerce.date().nullable().optional(),
    paxCount: z.number().nullable().optional(),
    durationNights: z.number().nullable().optional(),
    durationDays: z.number().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    includedServices: z.array(z.string()).nullable().optional(),
    excludedServices: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
