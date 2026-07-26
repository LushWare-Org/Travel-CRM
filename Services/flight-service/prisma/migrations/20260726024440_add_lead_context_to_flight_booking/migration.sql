-- AlterTable
ALTER TABLE "crm_flights"."FlightBooking" ADD COLUMN     "customizedPackageId" TEXT,
ADD COLUMN     "dayNumber" INTEGER,
ADD COLUMN     "flightType" TEXT NOT NULL DEFAULT 'itinerary',
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "packageId" TEXT;

-- CreateIndex
CREATE INDEX "FlightBooking_leadId_idx" ON "crm_flights"."FlightBooking"("leadId");

-- CreateIndex
CREATE INDEX "FlightBooking_leadId_dayNumber_idx" ON "crm_flights"."FlightBooking"("leadId", "dayNumber");
