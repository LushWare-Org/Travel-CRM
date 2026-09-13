-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_flights";

-- CreateEnum
CREATE TYPE "crm_flights"."FlightBookingStatus" AS ENUM ('quoted', 'pending', 'confirmed', 'ticketed', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "crm_flights"."TripType" AS ENUM ('oneWay', 'roundTrip', 'multiCity');

-- CreateEnum
CREATE TYPE "crm_flights"."TravelerType" AS ENUM ('adult', 'child', 'infant');

-- CreateTable
CREATE TABLE "crm_flights"."FlightBooking" (
    "id" TEXT NOT NULL,
    "pnr" TEXT,
    "travelportOrderId" TEXT,
    "createdById" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "tripType" "crm_flights"."TripType" NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "crm_flights"."FlightBookingStatus" NOT NULL DEFAULT 'quoted',
    "searchSnapshot" JSONB NOT NULL,
    "ticketingDeadline" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_flights"."FlightSegment" (
    "id" TEXT NOT NULL,
    "flightBookingId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "marketingCarrier" TEXT NOT NULL,
    "operatingCarrier" TEXT,
    "flightNumber" TEXT NOT NULL,
    "bookingClass" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "stops" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlightSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_flights"."FlightTraveler" (
    "id" TEXT NOT NULL,
    "flightBookingId" TEXT NOT NULL,
    "type" "crm_flights"."TravelerType" NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "nationality" TEXT,
    "frequentFlyerNumber" TEXT,

    CONSTRAINT "FlightTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlightBooking_createdById_createdAt_idx" ON "crm_flights"."FlightBooking"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "FlightBooking_status_idx" ON "crm_flights"."FlightBooking"("status");

-- CreateIndex
CREATE INDEX "FlightSegment_flightBookingId_idx" ON "crm_flights"."FlightSegment"("flightBookingId");

-- CreateIndex
CREATE INDEX "FlightTraveler_flightBookingId_idx" ON "crm_flights"."FlightTraveler"("flightBookingId");

-- AddForeignKey
ALTER TABLE "crm_flights"."FlightSegment" ADD CONSTRAINT "FlightSegment_flightBookingId_fkey" FOREIGN KEY ("flightBookingId") REFERENCES "crm_flights"."FlightBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_flights"."FlightTraveler" ADD CONSTRAINT "FlightTraveler_flightBookingId_fkey" FOREIGN KEY ("flightBookingId") REFERENCES "crm_flights"."FlightBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
