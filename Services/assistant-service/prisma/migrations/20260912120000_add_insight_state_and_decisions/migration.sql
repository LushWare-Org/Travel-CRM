-- CreateTable
CREATE TABLE "crm_assistant"."InsightState" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "scopeFingerprint" TEXT NOT NULL,
    "insightKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSurfacedAt" TIMESTAMP(3),
    "surfacedCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "lastMaterialValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_assistant"."InsightDecision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "actorId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "scopeFingerprint" TEXT NOT NULL,
    "insightKey" TEXT NOT NULL,
    "ruleId" TEXT,
    "entityKind" TEXT,
    "entityId" TEXT,
    "severity" TEXT NOT NULL,
    "rankScore" DOUBLE PRECISION,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rankingVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsightState_actorId_pageKey_scopeFingerprint_insightKey_key"
ON "crm_assistant"."InsightState"("actorId", "pageKey", "scopeFingerprint", "insightKey");

-- CreateIndex
CREATE INDEX "InsightState_actorId_pageKey_idx"
ON "crm_assistant"."InsightState"("actorId", "pageKey");

-- CreateIndex
CREATE INDEX "InsightDecision_actorId_pageKey_createdAt_idx"
ON "crm_assistant"."InsightDecision"("actorId", "pageKey", "createdAt");

-- CreateIndex
CREATE INDEX "InsightDecision_requestId_idx"
ON "crm_assistant"."InsightDecision"("requestId");
