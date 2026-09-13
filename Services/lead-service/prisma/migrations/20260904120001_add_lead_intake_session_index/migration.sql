-- CreateIndex
-- Single statement — Prisma does not wrap a one-statement migration in a
-- transaction, and CREATE INDEX CONCURRENTLY cannot run inside one.
CREATE UNIQUE INDEX CONCURRENTLY "Lead_intakeChannel_intakeSessionId_key" ON "crm_leads"."Lead"("intakeChannel", "intakeSessionId");
