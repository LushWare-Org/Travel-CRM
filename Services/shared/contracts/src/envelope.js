import { z } from 'zod';

// Every quotation/itinerary endpoint in scope returns this flat shape —
// { success, data }, never a nested data.data. Wrap a payload schema with
// this instead of re-guessing the envelope at each call site.
export const apiEnvelope = (dataSchema) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });
