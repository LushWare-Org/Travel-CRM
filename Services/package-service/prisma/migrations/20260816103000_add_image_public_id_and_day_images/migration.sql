-- AlterTable
ALTER TABLE "crm_packages"."Package_Image" ADD COLUMN IF NOT EXISTS "public_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "crm_packages"."Itinerary_Day" ADD COLUMN IF NOT EXISTS "images" JSONB NOT NULL DEFAULT '[]';
