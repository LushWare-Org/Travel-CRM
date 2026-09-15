-- AlterTable
-- Holds the most recent voice-agent itinerary edit awaiting a rep's review,
-- so the AI tab can show old vs new. Additive and nullable: every existing
-- selection reads as "no pending change", which is correct.
ALTER TABLE "crm_leads"."LeadPackageSelection" ADD COLUMN "pendingAiChange" JSONB;
