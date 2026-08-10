-- CreateIndex
-- Supports createOrVersionQuotation's per-(lead, package) lookup — a lead can
-- now hold several independently-quotable packages at once.
CREATE INDEX IF NOT EXISTS "Quotation_leadId_packageId_idx" ON "crm_billing"."Quotation"("leadId", "packageId");
