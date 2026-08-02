-- AlterEnum
ALTER TYPE "crm_packages"."TransportMode" ADD VALUE IF NOT EXISTS 'BUS';

-- AlterTable
ALTER TABLE "crm_packages"."Itinerary_Day" ADD COLUMN IF NOT EXISTS "flights" JSONB NOT NULL DEFAULT '[]';
