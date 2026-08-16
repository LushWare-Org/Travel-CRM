-- Rep-entered override for a quotation's destination text; wins over both
-- the selected package's own destination and the lead's inquiry-stage one.
ALTER TABLE "crm_leads"."LeadPackageSelection" ADD COLUMN "destinationOverride" TEXT;
