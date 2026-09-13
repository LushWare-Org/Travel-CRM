-- AlterTable
ALTER TABLE "crm_assistant"."AssistantEvent"
ADD COLUMN "turnId" TEXT,
ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "AssistantEvent_sessionId_turnId_idx"
ON "crm_assistant"."AssistantEvent"("sessionId", "turnId");
