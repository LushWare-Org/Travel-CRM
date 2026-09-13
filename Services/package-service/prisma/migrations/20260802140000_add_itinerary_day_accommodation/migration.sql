-- AlterTable
ALTER TABLE "crm_packages"."Itinerary_Day" ADD COLUMN IF NOT EXISTS "accommodation" JSONB NOT NULL DEFAULT '{}';
