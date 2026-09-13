-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_leads";

-- CreateEnum
CREATE TYPE "crm_leads"."LeadSource" AS ENUM ('manual', 'website', 'booking', 'social-media', 'phone-call', 'email', 'referral', 'walk-in', 'other');

-- CreateEnum
CREATE TYPE "crm_leads"."LeadPlatform" AS ENUM ('Manual Entry', 'Website Form', 'Paid Package', 'Social Media', 'Phone Call', 'Email', 'Referral', 'Walk-in');

-- CreateEnum
CREATE TYPE "crm_leads"."LeadLifecycleStatus" AS ENUM ('NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED', 'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST', 'BOOKING_FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "crm_leads"."LeadPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "crm_leads"."AssignmentMode" AS ENUM ('manual', 'auto');

-- CreateEnum
CREATE TYPE "crm_leads"."AssignmentStrategy" AS ENUM ('round_robin', 'load_based');

-- CreateEnum
CREATE TYPE "crm_leads"."CommunicationLogType" AS ENUM ('call', 'email', 'meeting', 'message', 'other');

-- CreateEnum
CREATE TYPE "crm_leads"."PricingBasis" AS ENUM ('PER_PERSON', 'PER_ROOM', 'PER_VEHICLE', 'PER_KM', 'FIXED');

-- CreateEnum
CREATE TYPE "crm_leads"."MarginType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "crm_leads"."CostLineSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "crm_leads"."OptionalFlightType" AS ENUM ('TO_START', 'RETURN_HOME');

-- CreateEnum
CREATE TYPE "crm_leads"."StatusHistoryActor" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "crm_leads"."DiscountType" AS ENUM ('none', 'percentage', 'fixed');

-- CreateEnum
CREATE TYPE "crm_leads"."CostLineCategory" AS ENUM ('accommodation', 'transportation', 'activity', 'food', 'guide', 'insurance', 'visa', 'package', 'other');

-- CreateTable
CREATE TABLE "crm_leads"."Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "city" TEXT,
    "source" "crm_leads"."LeadSource" NOT NULL DEFAULT 'manual',
    "platform" "crm_leads"."LeadPlatform" NOT NULL DEFAULT 'Manual Entry',
    "fromCountry" TEXT,
    "destinationCountry" TEXT,
    "destination" TEXT,
    "travelDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "convertedBookingId" TEXT,
    "currentItineraryId" TEXT,
    "primarySelectionId" TEXT,
    "leadDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numberOfTravelers" INTEGER,
    "budget" TEXT,
    "message" TEXT,
    "lifecycleStatus" "crm_leads"."LeadLifecycleStatus" NOT NULL DEFAULT 'NEW',
    "priority" "crm_leads"."LeadPriority" NOT NULL DEFAULT 'medium',
    "assignedToId" TEXT,
    "assignedById" TEXT,
    "assignmentMode" "crm_leads"."AssignmentMode" NOT NULL DEFAULT 'manual',
    "notifNewLead" BOOLEAN NOT NULL DEFAULT true,
    "notifStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifAssignment" BOOLEAN NOT NULL DEFAULT true,
    "notifFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "followUpDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadPackageSelection" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "packageId" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "packageName" TEXT,
    "sourcePackageId" TEXT,
    "currentQuoteId" TEXT,
    "quoteAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadPackageSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadRemark" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "text" TEXT,
    "addedById" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actor" "crm_leads"."StatusHistoryActor" NOT NULL DEFAULT 'USER',
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadCommunicationLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "crm_leads"."CommunicationLogType",
    "notes" TEXT,
    "byId" TEXT,

    CONSTRAINT "LeadCommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadInternalEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadInternalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadPricing" (
    "id" TEXT NOT NULL,
    "leadPackageSelectionId" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "marginType" "crm_leads"."MarginType",
    "marginValue" DECIMAL(12,2),
    "depositType" "crm_leads"."MarginType",
    "depositValue" DECIMAL(12,2),
    "discountType" "crm_leads"."DiscountType" NOT NULL DEFAULT 'none',
    "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceChargeRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualTotal" DECIMAL(12,2),
    "sellSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceChargeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadCostLine" (
    "id" TEXT NOT NULL,
    "leadPackageSelectionId" TEXT NOT NULL,
    "category" "crm_leads"."CostLineCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "basis" "crm_leads"."PricingBasis" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualUnitPrice" DECIMAL(12,2),
    "quotedUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualTotal" DECIMAL(12,2),
    "sellTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginType" "crm_leads"."MarginType",
    "marginValue" DECIMAL(12,2),
    "source" "crm_leads"."CostLineSource" NOT NULL DEFAULT 'AUTO',
    "dayNumber" INTEGER,
    "flightBookingId" TEXT,
    "optionalFlightId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadItineraryDay" (
    "id" TEXT NOT NULL,
    "leadPackageSelectionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "breakfastCount" INTEGER NOT NULL DEFAULT 0,
    "lunchCount" INTEGER NOT NULL DEFAULT 0,
    "dinnerCount" INTEGER NOT NULL DEFAULT 0,
    "mealPriceOverride" DECIMAL(12,2),
    "accommodation" JSONB NOT NULL DEFAULT '{}',
    "flights" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadDayPlace" (
    "id" TEXT NOT NULL,
    "leadItineraryDayId" TEXT NOT NULL,
    "placeId" TEXT,
    "customName" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadDayPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadDayActivity" (
    "id" TEXT NOT NULL,
    "leadItineraryDayId" TEXT NOT NULL,
    "activityId" TEXT,
    "name" TEXT,
    "description" TEXT,
    "defaultCost" DECIMAL(12,2),
    "costOverride" DECIMAL(12,2),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadDayActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadDayImage" (
    "id" TEXT NOT NULL,
    "leadItineraryDayId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadDayImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadDayTransport" (
    "id" TEXT NOT NULL,
    "leadItineraryDayId" TEXT NOT NULL,
    "routeType" TEXT,
    "transportMode" TEXT,
    "pricingModel" TEXT,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "distanceKm" DECIMAL(8,2),
    "origin" TEXT,
    "destination" TEXT,

    CONSTRAINT "LeadDayTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."LeadOptionalFlight" (
    "id" TEXT NOT NULL,
    "leadPackageSelectionId" TEXT NOT NULL,
    "flightType" "crm_leads"."OptionalFlightType" NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "date" TIMESTAMP(3),
    "cabinClass" TEXT,
    "departureTime" TEXT,
    "airlinePreference" TEXT,
    "notes" TEXT,
    "flightBookingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualUnitPrice" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "marginType" "crm_leads"."MarginType",
    "marginValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOptionalFlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads"."Settings" (
    "id" TEXT NOT NULL,
    "assignmentMode" "crm_leads"."AssignmentMode" NOT NULL DEFAULT 'manual',
    "autoStrategy" "crm_leads"."AssignmentStrategy" NOT NULL DEFAULT 'round_robin',
    "enabledSalesRepIds" TEXT[],
    "roundRobinIndex" INTEGER NOT NULL DEFAULT 0,
    "maxOpenLeadsPerRep" INTEGER NOT NULL DEFAULT 100,
    "skipInactive" BOOLEAN NOT NULL DEFAULT true,
    "requireActiveLogin48h" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_lifecycleStatus_createdAt_idx" ON "crm_leads"."Lead"("lifecycleStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_lifecycleStatus_createdAt_idx" ON "crm_leads"."Lead"("assignedToId", "lifecycleStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_followUpDate_idx" ON "crm_leads"."Lead"("followUpDate");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "crm_leads"."Lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_platform_idx" ON "crm_leads"."Lead"("platform");

-- CreateIndex
CREATE INDEX "Lead_fromCountry_destinationCountry_idx" ON "crm_leads"."Lead"("fromCountry", "destinationCountry");

-- CreateIndex
CREATE INDEX "Lead_leadDateTime_idx" ON "crm_leads"."Lead"("leadDateTime");

-- CreateIndex
CREATE INDEX "Lead_assignmentMode_idx" ON "crm_leads"."Lead"("assignmentMode");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "crm_leads"."Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_primarySelectionId_idx" ON "crm_leads"."Lead"("primarySelectionId");

-- CreateIndex
CREATE INDEX "LeadPackageSelection_leadId_idx" ON "crm_leads"."LeadPackageSelection"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadPackageSelection_leadId_packageId_key" ON "crm_leads"."LeadPackageSelection"("leadId", "packageId");

-- CreateIndex
CREATE INDEX "LeadRemark_leadId_idx" ON "crm_leads"."LeadRemark"("leadId");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_leadId_idx" ON "crm_leads"."LeadStatusHistory"("leadId");

-- CreateIndex
CREATE INDEX "LeadCommunicationLog_leadId_idx" ON "crm_leads"."LeadCommunicationLog"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadInternalEvent_eventId_key" ON "crm_leads"."LeadInternalEvent"("eventId");

-- CreateIndex
CREATE INDEX "LeadInternalEvent_leadId_idx" ON "crm_leads"."LeadInternalEvent"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadPricing_leadPackageSelectionId_key" ON "crm_leads"."LeadPricing"("leadPackageSelectionId");

-- CreateIndex
CREATE INDEX "LeadCostLine_leadPackageSelectionId_idx" ON "crm_leads"."LeadCostLine"("leadPackageSelectionId");

-- CreateIndex
CREATE INDEX "LeadItineraryDay_leadPackageSelectionId_idx" ON "crm_leads"."LeadItineraryDay"("leadPackageSelectionId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadItineraryDay_leadPackageSelectionId_dayNumber_key" ON "crm_leads"."LeadItineraryDay"("leadPackageSelectionId", "dayNumber");

-- CreateIndex
CREATE INDEX "LeadDayPlace_leadItineraryDayId_idx" ON "crm_leads"."LeadDayPlace"("leadItineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDayPlace_leadItineraryDayId_orderIndex_key" ON "crm_leads"."LeadDayPlace"("leadItineraryDayId", "orderIndex");

-- CreateIndex
CREATE INDEX "LeadDayActivity_leadItineraryDayId_idx" ON "crm_leads"."LeadDayActivity"("leadItineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDayActivity_leadItineraryDayId_orderIndex_key" ON "crm_leads"."LeadDayActivity"("leadItineraryDayId", "orderIndex");

-- CreateIndex
CREATE INDEX "LeadDayImage_leadItineraryDayId_idx" ON "crm_leads"."LeadDayImage"("leadItineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDayImage_leadItineraryDayId_orderIndex_key" ON "crm_leads"."LeadDayImage"("leadItineraryDayId", "orderIndex");

-- CreateIndex
CREATE INDEX "LeadDayTransport_leadItineraryDayId_idx" ON "crm_leads"."LeadDayTransport"("leadItineraryDayId");

-- CreateIndex
CREATE INDEX "LeadOptionalFlight_leadPackageSelectionId_idx" ON "crm_leads"."LeadOptionalFlight"("leadPackageSelectionId");

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadPackageSelection" ADD CONSTRAINT "LeadPackageSelection_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadRemark" ADD CONSTRAINT "LeadRemark_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadCommunicationLog" ADD CONSTRAINT "LeadCommunicationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadInternalEvent" ADD CONSTRAINT "LeadInternalEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadPricing" ADD CONSTRAINT "LeadPricing_leadPackageSelectionId_fkey" FOREIGN KEY ("leadPackageSelectionId") REFERENCES "crm_leads"."LeadPackageSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadCostLine" ADD CONSTRAINT "LeadCostLine_leadPackageSelectionId_fkey" FOREIGN KEY ("leadPackageSelectionId") REFERENCES "crm_leads"."LeadPackageSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadItineraryDay" ADD CONSTRAINT "LeadItineraryDay_leadPackageSelectionId_fkey" FOREIGN KEY ("leadPackageSelectionId") REFERENCES "crm_leads"."LeadPackageSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadDayPlace" ADD CONSTRAINT "LeadDayPlace_leadItineraryDayId_fkey" FOREIGN KEY ("leadItineraryDayId") REFERENCES "crm_leads"."LeadItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadDayActivity" ADD CONSTRAINT "LeadDayActivity_leadItineraryDayId_fkey" FOREIGN KEY ("leadItineraryDayId") REFERENCES "crm_leads"."LeadItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadDayImage" ADD CONSTRAINT "LeadDayImage_leadItineraryDayId_fkey" FOREIGN KEY ("leadItineraryDayId") REFERENCES "crm_leads"."LeadItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadDayTransport" ADD CONSTRAINT "LeadDayTransport_leadItineraryDayId_fkey" FOREIGN KEY ("leadItineraryDayId") REFERENCES "crm_leads"."LeadItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads"."LeadOptionalFlight" ADD CONSTRAINT "LeadOptionalFlight_leadPackageSelectionId_fkey" FOREIGN KEY ("leadPackageSelectionId") REFERENCES "crm_leads"."LeadPackageSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

