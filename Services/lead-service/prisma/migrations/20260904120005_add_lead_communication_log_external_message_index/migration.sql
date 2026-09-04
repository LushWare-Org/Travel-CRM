-- CreateIndex
-- Single statement — Prisma does not wrap a one-statement migration in a
-- transaction, and CREATE INDEX CONCURRENTLY cannot run inside one. Existing
-- rows are all-NULL on externalMessageId (Postgres treats NULLs as distinct
-- for uniqueness), so this build cannot fail on pre-existing duplicates.
CREATE UNIQUE INDEX CONCURRENTLY "LeadCommunicationLog_leadId_externalMessageId_key" ON "crm_leads"."LeadCommunicationLog"("leadId", "externalMessageId");
