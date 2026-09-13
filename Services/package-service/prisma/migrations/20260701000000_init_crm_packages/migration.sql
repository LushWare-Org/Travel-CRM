-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_packages";

-- CreateEnum
CREATE TYPE "crm_packages"."PackageCategory" AS ENUM ('HONEYMOON', 'COUPLE', 'FAMILY', 'GROUP', 'WILD_SAFARI');

-- CreateEnum
CREATE TYPE "crm_packages"."MarginType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "crm_packages"."PlaceType" AS ENUM ('CITY', 'ATTRACTION', 'REGION', 'AIRPORT');

-- CreateEnum
CREATE TYPE "crm_packages"."RouteType" AS ENUM ('DAILY_ROUTING', 'POINT_TO_POINT');

-- CreateEnum
CREATE TYPE "crm_packages"."TransportMode" AS ENUM ('FLIGHT', 'CAR', 'TRAIN', 'BOAT', 'VAN', 'BUS');

-- CreateEnum
CREATE TYPE "crm_packages"."PricingModel" AS ENUM ('PER_KM', 'PER_PERSON', 'PER_VEHICLE');

-- CreateEnum
CREATE TYPE "crm_packages"."HotelBookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "crm_packages"."Package" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "slug" TEXT,
    "description" TEXT,
    "destination" VARCHAR(255),
    "duration_days" INTEGER NOT NULL DEFAULT 1,
    "category" "crm_packages"."PackageCategory" NOT NULL DEFAULT 'FAMILY',
    "cover_image" VARCHAR(500),
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "terms_and_conditions" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "default_margin_type" "crm_packages"."MarginType" NOT NULL DEFAULT 'PERCENTAGE',
    "default_margin_input" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "num_reviews" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Package_Image" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "url" TEXT,
    "public_id" VARCHAR(255),
    "alt_text" VARCHAR(255),
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Package_Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Itinerary_Day" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "breakfast_count" INTEGER NOT NULL DEFAULT 0,
    "lunch_count" INTEGER NOT NULL DEFAULT 0,
    "dinner_count" INTEGER NOT NULL DEFAULT 0,
    "meal_price_override" DECIMAL(10,2),
    "accommodation" JSONB NOT NULL DEFAULT '{}',
    "flights" JSONB NOT NULL DEFAULT '[]',
    "images" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Place" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "crm_packages"."PlaceType" NOT NULL,
    "default_cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Package_Day_Place" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "placeId" TEXT,
    "custom_name" VARCHAR(255),
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Package_Day_Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Activity_Catalog" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "default_cost" DECIMAL(10,2) NOT NULL,
    "vendor_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_Catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Package_Day_Activity" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "cost_override" DECIMAL(10,2),

    CONSTRAINT "Package_Day_Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Package_Day_Transport" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "route_type" "crm_packages"."RouteType" NOT NULL,
    "transport_mode" "crm_packages"."TransportMode" NOT NULL,
    "pricing_model" "crm_packages"."PricingModel" NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "distance_km" DECIMAL(8,2),
    "origin_place_id" TEXT,
    "destination_place_id" TEXT,

    CONSTRAINT "Package_Day_Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."Review" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "authorId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_packages"."HotelBooking" (
    "id" TEXT NOT NULL,
    "liteapiBookingId" TEXT,
    "hotelId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "hotelAddress" TEXT,
    "hotelImage" TEXT,
    "checkin" TIMESTAMP(3) NOT NULL,
    "checkout" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "crm_packages"."HotelBookingStatus" NOT NULL DEFAULT 'pending',
    "createdById" TEXT NOT NULL,
    "customerId" TEXT,
    "guestInfo" JSONB NOT NULL,
    "roomDetails" JSONB NOT NULL,
    "searchSnapshot" JSONB NOT NULL,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "supplierPortalUrl" TEXT,
    "pnrCode" TEXT,
    "leadId" TEXT,
    "packageId" TEXT,
    "customizedPackageId" TEXT,
    "dayNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "crm_packages"."Package"("slug");

-- CreateIndex
CREATE INDEX "Package_category_idx" ON "crm_packages"."Package"("category");

-- CreateIndex
CREATE INDEX "Package_destination_idx" ON "crm_packages"."Package"("destination");

-- CreateIndex
CREATE INDEX "Package_is_active_idx" ON "crm_packages"."Package"("is_active");

-- CreateIndex
CREATE INDEX "Package_is_featured_idx" ON "crm_packages"."Package"("is_featured");

-- CreateIndex
CREATE INDEX "Package_created_by_idx" ON "crm_packages"."Package"("created_by");

-- CreateIndex
CREATE INDEX "Package_base_price_idx" ON "crm_packages"."Package"("base_price");

-- CreateIndex
CREATE INDEX "Package_rating_idx" ON "crm_packages"."Package"("rating");

-- CreateIndex
CREATE INDEX "Package_bookings_idx" ON "crm_packages"."Package"("bookings");

-- CreateIndex
CREATE INDEX "Package_createdAt_idx" ON "crm_packages"."Package"("createdAt");

-- CreateIndex
CREATE INDEX "Package_is_active_category_idx" ON "crm_packages"."Package"("is_active", "category");

-- CreateIndex
CREATE INDEX "Package_is_active_is_featured_idx" ON "crm_packages"."Package"("is_active", "is_featured");

-- CreateIndex
CREATE INDEX "Package_Image_packageId_idx" ON "crm_packages"."Package_Image"("packageId");

-- CreateIndex
CREATE INDEX "Itinerary_Day_packageId_idx" ON "crm_packages"."Itinerary_Day"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_Day_packageId_day_number_key" ON "crm_packages"."Itinerary_Day"("packageId", "day_number");

-- CreateIndex
CREATE UNIQUE INDEX "Place_name_key" ON "crm_packages"."Place"("name");

-- CreateIndex
CREATE INDEX "Place_type_idx" ON "crm_packages"."Place"("type");

-- CreateIndex
CREATE INDEX "Package_Day_Place_itineraryDayId_idx" ON "crm_packages"."Package_Day_Place"("itineraryDayId");

-- CreateIndex
CREATE INDEX "Package_Day_Place_placeId_idx" ON "crm_packages"."Package_Day_Place"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_Day_Place_itineraryDayId_order_index_key" ON "crm_packages"."Package_Day_Place"("itineraryDayId", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_Catalog_name_key" ON "crm_packages"."Activity_Catalog"("name");

-- CreateIndex
CREATE INDEX "Package_Day_Activity_itineraryDayId_idx" ON "crm_packages"."Package_Day_Activity"("itineraryDayId");

-- CreateIndex
CREATE INDEX "Package_Day_Activity_activityId_idx" ON "crm_packages"."Package_Day_Activity"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_Day_Activity_itineraryDayId_order_index_key" ON "crm_packages"."Package_Day_Activity"("itineraryDayId", "order_index");

-- CreateIndex
CREATE INDEX "Package_Day_Transport_itineraryDayId_idx" ON "crm_packages"."Package_Day_Transport"("itineraryDayId");

-- CreateIndex
CREATE INDEX "Review_packageId_createdAt_idx" ON "crm_packages"."Review"("packageId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelBooking_createdById_createdAt_idx" ON "crm_packages"."HotelBooking"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "HotelBooking_status_idx" ON "crm_packages"."HotelBooking"("status");

-- CreateIndex
CREATE INDEX "HotelBooking_leadId_idx" ON "crm_packages"."HotelBooking"("leadId");

-- CreateIndex
CREATE INDEX "HotelBooking_leadId_dayNumber_idx" ON "crm_packages"."HotelBooking"("leadId", "dayNumber");

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Image" ADD CONSTRAINT "Package_Image_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "crm_packages"."Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Itinerary_Day" ADD CONSTRAINT "Itinerary_Day_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "crm_packages"."Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Place" ADD CONSTRAINT "Package_Day_Place_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "crm_packages"."Itinerary_Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Place" ADD CONSTRAINT "Package_Day_Place_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "crm_packages"."Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Activity" ADD CONSTRAINT "Package_Day_Activity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "crm_packages"."Itinerary_Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Activity" ADD CONSTRAINT "Package_Day_Activity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm_packages"."Activity_Catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Transport" ADD CONSTRAINT "Package_Day_Transport_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "crm_packages"."Itinerary_Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Transport" ADD CONSTRAINT "Package_Day_Transport_origin_place_id_fkey" FOREIGN KEY ("origin_place_id") REFERENCES "crm_packages"."Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Package_Day_Transport" ADD CONSTRAINT "Package_Day_Transport_destination_place_id_fkey" FOREIGN KEY ("destination_place_id") REFERENCES "crm_packages"."Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_packages"."Review" ADD CONSTRAINT "Review_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "crm_packages"."Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
