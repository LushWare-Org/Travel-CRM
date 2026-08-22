import { z } from 'zod';

const headerDocumentSchema = z.object({
  link: z.string().url(),
  filename: z.string().trim().min(1),
});

/**
 * Body for POST /internal/whatsapp. `type: 'template'` is the only path
 * allowed for business-initiated sends (quotations/invoices/receipts/
 * vouchers); `type: 'text'` is free-form and only accepted by Meta within a
 * live 24h customer session — used for agent replies.
 */
export const sendWhatsappSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('template'),
    to: z.string().trim().min(1),
    templateName: z.string().trim().min(1),
    languageCode: z.string().trim().min(1).default('en_US'),
    headerDocument: headerDocumentSchema.optional(),
    bodyParams: z.array(z.string()).max(10).optional(),
    meta: z
      .object({ sourceService: z.string().trim().min(1), kind: z.string().trim().min(1) })
      .partial()
      .optional(),
  }),
  z.object({
    type: z.literal('text'),
    to: z.string().trim().min(1),
    body: z.string().trim().min(1).max(4096),
    meta: z
      .object({ sourceService: z.string().trim().min(1), kind: z.string().trim().min(1) })
      .partial()
      .optional(),
  }),
]);
