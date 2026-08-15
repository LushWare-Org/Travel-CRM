-- AlterTable
-- Mirrors Invoice.whatsappSent/whatsappSentAt so sendPaymentReceipt can
-- track WhatsApp delivery the same way sendInvoice already does.
ALTER TABLE "crm_billing"."PaymentReceipt" ADD COLUMN IF NOT EXISTS "whatsappSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_billing"."PaymentReceipt" ADD COLUMN IF NOT EXISTS "whatsappSentAt" TIMESTAMP(3);
