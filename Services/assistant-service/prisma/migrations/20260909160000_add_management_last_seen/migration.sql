-- CreateTable
CREATE TABLE "crm_assistant"."ManagementLastSeen" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "scopeFingerprint" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementLastSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagementLastSeen_actorId_pageKey_scopeFingerprint_key"
ON "crm_assistant"."ManagementLastSeen"("actorId", "pageKey", "scopeFingerprint");

-- CreateIndex
CREATE INDEX "ManagementLastSeen_actorId_idx"
ON "crm_assistant"."ManagementLastSeen"("actorId");
