-- CreateTable
CREATE TABLE "crm_assistant"."BusinessNotificationState" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "surfacedCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "lastMaterialValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessNotificationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessNotificationState_actorId_notificationKey_key"
ON "crm_assistant"."BusinessNotificationState"("actorId", "notificationKey");

-- CreateIndex
CREATE INDEX "BusinessNotificationState_actorId_idx"
ON "crm_assistant"."BusinessNotificationState"("actorId");
