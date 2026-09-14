-- CreateIndex
-- Single statement — Prisma does not wrap a one-statement migration in a
-- transaction, and CREATE INDEX CONCURRENTLY cannot run inside one.
CREATE INDEX CONCURRENTLY "Lead_whatsappNormalized_idx" ON "crm_leads"."Lead"("whatsappNormalized");
