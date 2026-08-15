import { z } from 'zod';

/**
 * Body for POST /vouchers/:id/send. `channel` picks the delivery medium;
 * `email`/`phone` optionally override the voucher snapshot's contact.
 */
export const sendVoucherSchema = z.object({
  channel: z.enum(['email', 'whatsapp']).default('email'),
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).optional(),
});
