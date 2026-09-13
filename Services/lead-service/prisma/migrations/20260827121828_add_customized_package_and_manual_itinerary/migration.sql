-- CreateEnum
CREATE TYPE "crm_leads"."CustomizationRequestStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "crm_leads"."CustomizedPackage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "originalPackageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "destination" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT,
    "images" JSONB,
    "coverImage" JSONB,
    "inclusions" JSONB,
    "exclusions" JSONB,
    "highlights" JSONB,
    "terms" JSONB,
    "days" JSONB,
    "status" "crm_leads"."CustomizationRequestStatus" NOT NULL DEFAULT 'pending',
    "customizationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizedPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."ManualItinerary" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "days" JSONB NOT NULL,
    "status" "crm_leads"."CustomizationRequestStatus" NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomizedPackage_leadId_idx" ON "crm_leads"."CustomizedPackage"("leadId");

-- CreateIndex
CREATE INDEX "CustomizedPackage_originalPackageId_idx" ON "crm_leads"."CustomizedPackage"("originalPackageId");

-- CreateIndex
CREATE INDEX "CustomizedPackage_createdAt_idx" ON "crm_leads"."CustomizedPackage"("createdAt");

-- CreateIndex
CREATE INDEX "ManualItinerary_leadId_idx" ON "crm_leads"."ManualItinerary"("leadId");

-- CreateIndex
CREATE INDEX "ManualItinerary_createdAt_idx" ON "crm_leads"."ManualItinerary"("createdAt");

-- AddForeignKey
ALTER TABLE "crm_leads"."CustomizedPackage" ADD CONSTRAINT "CustomizedPackage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."ManualItinerary" ADD CONSTRAINT "ManualItinerary_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
