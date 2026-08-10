import { z } from 'zod';

/**
 * Body for POST /quotations/:id/send. `channel` picks the delivery medium;
 * `email`/`phone` optionally override the customer snapshot's contact.
 */
export const sendQuotationSchema = z
  .object({
    channel: z.enum(['email', 'whatsapp']).default('email'),
    email: z.string().email().optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .refine((v) => v.channel !== 'whatsapp' || true, { message: 'Invalid send payload' });
