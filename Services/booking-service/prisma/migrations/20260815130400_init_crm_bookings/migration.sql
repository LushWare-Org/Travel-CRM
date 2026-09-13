-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_bookings";

-- CreateEnum
CREATE TYPE "crm_bookings"."PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "crm_bookings"."BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "crm_bookings"."TravelerGender" AS ENUM ('male', 'female', 'other');

-- CreateTable
CREATE TABLE "crm_bookings"."Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "assignedToId" TEXT,
    "travelDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "numberOfTravelers" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "crm_bookings"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "bookingStatus" "crm_bookings"."BookingStatus" NOT NULL DEFAULT 'pending',
    "specialRequests" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_bookings"."BookingTraveler" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "crm_bookings"."TravelerGender",
    "idType" TEXT,
    "idNumber" TEXT,

    CONSTRAINT "BookingTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "crm_bookings"."Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_bookingStatus_idx" ON "crm_bookings"."Booking"("bookingStatus");

-- CreateIndex
CREATE INDEX "Booking_travelDate_idx" ON "crm_bookings"."Booking"("travelDate");

-- CreateIndex
CREATE INDEX "Booking_assignedToId_idx" ON "crm_bookings"."Booking"("assignedToId");

-- CreateIndex
CREATE INDEX "Booking_endDate_idx" ON "crm_bookings"."Booking"("endDate");

-- CreateIndex
CREATE INDEX "BookingTraveler_bookingId_idx" ON "crm_bookings"."BookingTraveler"("bookingId");

-- AddForeignKey
ALTER TABLE "crm_bookings"."BookingTraveler" ADD CONSTRAINT "BookingTraveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "crm_bookings"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

