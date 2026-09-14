-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_voice";

-- CreateEnum
CREATE TYPE "crm_voice"."CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "crm_voice"."CallerMatchOutcome" AS ENUM ('NONE', 'MATCHED', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "crm_voice"."CallDisposition" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'FAILED');

-- CreateTable
CREATE TABLE "crm_voice"."VoiceNumber" (
    "id" TEXT NOT NULL,
    "e164" TEXT NOT NULL,
    "label" TEXT,
    "retellAgentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "disclosureText" TEXT,
    "businessHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_voice"."VoiceCall" (
    "id" TEXT NOT NULL,
    "retellCallId" TEXT NOT NULL,
    "numberId" TEXT,
    "direction" "crm_voice"."CallDirection" NOT NULL DEFAULT 'INBOUND',
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "disposition" "crm_voice"."CallDisposition" NOT NULL DEFAULT 'IN_PROGRESS',
    "matchOutcome" "crm_voice"."CallerMatchOutcome" NOT NULL DEFAULT 'NONE',
    "leadId" TEXT,
    "needsRepFollowup" BOOLEAN NOT NULL DEFAULT false,
    "transcript" JSONB,
    "recordingUrl" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "costCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_voice"."VoiceCallEvent" (
    "id" TEXT NOT NULL,
    "voiceCallId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "functionName" TEXT NOT NULL,
    "args" JSONB,
    "result" JSONB,
    "latencyMs" INTEGER,
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNumber_e164_key" ON "crm_voice"."VoiceNumber"("e164");

-- CreateIndex
CREATE INDEX "VoiceNumber_isActive_idx" ON "crm_voice"."VoiceNumber"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCall_retellCallId_key" ON "crm_voice"."VoiceCall"("retellCallId");

-- CreateIndex
CREATE INDEX "VoiceCall_leadId_idx" ON "crm_voice"."VoiceCall"("leadId");

-- CreateIndex
CREATE INDEX "VoiceCall_fromNumber_idx" ON "crm_voice"."VoiceCall"("fromNumber");

-- CreateIndex
CREATE INDEX "VoiceCall_startedAt_idx" ON "crm_voice"."VoiceCall"("startedAt");

-- CreateIndex
CREATE INDEX "VoiceCall_disposition_idx" ON "crm_voice"."VoiceCall"("disposition");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCallEvent_voiceCallId_sequence_key" ON "crm_voice"."VoiceCallEvent"("voiceCallId", "sequence");

-- CreateIndex
CREATE INDEX "VoiceCallEvent_voiceCallId_idx" ON "crm_voice"."VoiceCallEvent"("voiceCallId");

-- AddForeignKey
ALTER TABLE "crm_voice"."VoiceCall" ADD CONSTRAINT "VoiceCall_numberId_fkey" FOREIGN KEY ("numberId") REFERENCES "crm_voice"."VoiceNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_voice"."VoiceCallEvent" ADD CONSTRAINT "VoiceCallEvent_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "crm_voice"."VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
