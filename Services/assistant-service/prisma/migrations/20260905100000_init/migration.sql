-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_assistant";

-- CreateTable
CREATE TABLE "crm_assistant"."AssistantEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "tool" TEXT,
    "route" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantEvent_sessionId_idx" ON "crm_assistant"."AssistantEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantEvent_createdAt_idx" ON "crm_assistant"."AssistantEvent"("createdAt");
