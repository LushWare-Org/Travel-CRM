-- AlterEnum
ALTER TYPE "crm_leads"."LeadLifecycleStatus" ADD VALUE 'PENDING_VERIFICATION' BEFORE 'NEW';

-- AlterEnum
ALTER TYPE "crm_leads"."LeadSource" ADD VALUE 'chatbot';

-- AlterEnum
ALTER TYPE "crm_leads"."LeadPlatform" ADD VALUE 'Chatbot Wizard';

-- AlterTable
ALTER TABLE "crm_leads"."Lead" ADD COLUMN "intakeChannel" TEXT,
ADD COLUMN "intakeSessionId" TEXT;

-- AlterTable
ALTER TABLE "crm_leads"."LeadCommunicationLog" ADD COLUMN "externalMessageId" TEXT;

-- The five new indexes below (composite unique on Lead.intakeChannel/intakeSessionId,
-- three single-column indexes on Lead.email/phone/whatsapp, and the unique index
-- on LeadCommunicationLog.leadId/externalMessageId) are deliberately NOT created
-- here. This migration has multiple statements, so Prisma wraps it in one
-- transaction — and CREATE INDEX CONCURRENTLY cannot run inside a transaction
-- block in PostgreSQL. On the live shared crm_leads.Lead/LeadCommunicationLog
-- tables, a non-concurrent index build takes a SHARE lock blocking all writes
-- for the full build. Each index is created CONCURRENTLY in its own
-- single-statement migration immediately following this one (see
-- 20260904120001-20260904120005), which Prisma does NOT wrap in a transaction.
