-- CreateTable
CREATE TABLE IF NOT EXISTS "crm_billing"."VoucherFlightSegment" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dayNumber" INTEGER,
    "marketingCarrier" TEXT,
    "flightNumber" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "departureAt" TIMESTAMP(3),
    "arrivalAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherFlightSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoucherFlightSegment_voucherId_idx" ON "crm_billing"."VoucherFlightSegment"("voucherId");

-- AddForeignKey
ALTER TABLE "crm_billing"."VoucherFlightSegment" ADD CONSTRAINT "VoucherFlightSegment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "crm_billing"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
