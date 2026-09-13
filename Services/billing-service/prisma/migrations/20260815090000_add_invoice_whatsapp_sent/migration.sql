-- AlterTable
-- Mirrors Quotation.whatsappSent/whatsappSentAt so sendInvoice can track
-- WhatsApp delivery the same way sendQuotation already does.
ALTER TABLE "crm_billing"."Invoice" ADD COLUMN IF NOT EXISTS "whatsappSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_billing"."Invoice" ADD COLUMN IF NOT EXISTS "whatsappSentAt" TIMESTAMP(3);
