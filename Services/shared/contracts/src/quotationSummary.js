import { z } from 'zod';

// Matches billing-service's Quotation row as returned by getAllQuotations
// and sendQuotation (quotation.controller.js). .passthrough() — Management
// reads many more display fields off this row than this contract should
// hard-fail on, and the two endpoints don't return identical field sets
// (getAllQuotations includes items/images/revisionHistory, send doesn't).
export const QuotationSummary = z
  .object({
    id: z.string(),
    quotationNumber: z.string(),
    status: z.string(),
    leadId: z.string(),
  })
  .passthrough();
