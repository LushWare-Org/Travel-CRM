-- CreateTable
CREATE TABLE "crm_assistant"."AssistantSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "shownPackageIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bookingDraft" JSONB,
    "bookingStatus" TEXT,
    "bookingId" TEXT,
    "bookingAskedTurn" INTEGER,
    "turnCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssistantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_assistant"."AssistantMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantSession_lastSeenAt_idx" ON "crm_assistant"."AssistantSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_sessionId_seq_idx" ON "crm_assistant"."AssistantMessage"("sessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantMessage_sessionId_seq_key" ON "crm_assistant"."AssistantMessage"("sessionId", "seq");
