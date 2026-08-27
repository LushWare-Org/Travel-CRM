import { z } from 'zod';

// Every quotation/itinerary endpoint in scope returns this flat shape —
// { success, data }, never a nested data.data. Wrap a payload schema with
// this instead of re-guessing the envelope at each call site.
export const apiEnvelope = (dataSchema) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });

// auth-service, user-service and career-service reply with
// { status: 'success', data } instead of { success: true, data }. This
// tolerates either convention so callers don't need to know which one a
// given service uses.
export const apiEnvelopeAny = (dataSchema) =>
  z
    .object({
      success: z.boolean().optional(),
      status: z.string().optional(),
      data: dataSchema,
      message: z.string().optional(),
      pagination: z.unknown().optional(),
    })
    .passthrough();
