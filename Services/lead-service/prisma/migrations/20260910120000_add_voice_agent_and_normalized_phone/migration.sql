-- AlterEnum
ALTER TYPE "crm_leads"."LeadSource" ADD VALUE 'voice-agent';

-- AlterEnum
ALTER TYPE "crm_leads"."LeadPlatform" ADD VALUE 'Voice Agent';

-- AlterTable
ALTER TABLE "crm_leads"."Lead" ADD COLUMN "phoneNormalized" TEXT,
ADD COLUMN "whatsappNormalized" TEXT,
ADD COLUMN "aiHandled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "needsRepFollowup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiVerifiedAt" TIMESTAMP(3),
ADD COLUMN "aiVerifiedById" TEXT;

-- Backfill the digits-only mirrors from whatever format each row already holds.
-- Rewrites every row with a phone/whatsapp, so it takes row locks for the length
-- of the scan; crm_leads.Lead is small enough for this to be a seconds-scale
-- operation, unlike the index builds which are split out below.
UPDATE "crm_leads"."Lead"
   SET "phoneNormalized" = NULLIF(REGEXP_REPLACE("phone", '[^0-9]', '', 'g'), '')
 WHERE "phone" IS NOT NULL;

UPDATE "crm_leads"."Lead"
   SET "whatsappNormalized" = NULLIF(REGEXP_REPLACE("whatsapp", '[^0-9]', '', 'g'), '')
 WHERE "whatsapp" IS NOT NULL;

-- The four indexes for the columns above are created CONCURRENTLY in their own
-- single-statement migrations (20260910120001-20260910120004), following the
-- convention set by 20260904120001-20260904120005: this migration has multiple
-- statements so Prisma wraps it in a transaction, and CREATE INDEX CONCURRENTLY
-- cannot run inside one.
