-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_users";

-- CreateEnum
CREATE TYPE "crm_users"."UserRole" AS ENUM ('customer', 'salesRep', 'vendor', 'admin', 'superAdmin');

-- CreateEnum
CREATE TYPE "crm_users"."VendorStatus" AS ENUM ('pending_verification', 'verified', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "crm_users"."ServiceType" AS ENUM ('hotel', 'transport', 'activity', 'restaurant', 'guide', 'other');

-- CreateTable
CREATE TABLE "crm_users"."User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" TEXT,
    "phoneCountry" VARCHAR(2) DEFAULT 'US',
    "phoneE164" TEXT,
    "password" TEXT NOT NULL,
    "role" "crm_users"."UserRole" NOT NULL DEFAULT 'customer',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[],
    "avatarPublicId" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTempPassword" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "canBeDeleted" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedAt" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationExpire" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordExpire" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_users"."VendorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "serviceType" "crm_users"."ServiceType",
    "businessRegistrationNumber" TEXT,
    "taxIdentificationNumber" TEXT,
    "addressStreet" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZipCode" TEXT,
    "addressCountry" TEXT,
    "contactPersonName" TEXT,
    "contactPersonPhone" TEXT,
    "contactPersonEmail" TEXT,
    "contactPersonDesignation" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "bankBranchName" TEXT,
    "bankIfscCode" TEXT,
    "bankSwiftCode" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "vendorStatus" "crm_users"."VendorStatus" NOT NULL DEFAULT 'pending_verification',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_users"."OrganizationSettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Travel CRM',
    "companyShortName" TEXT,
    "companyLegalName" TEXT,
    "companyAddress" TEXT,
    "companyGstNumber" TEXT,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "salesEmail" TEXT,
    "supportEmail" TEXT,
    "contactPhone" TEXT,
    "whatsappNumber" TEXT,
    "website" TEXT,
    "themeInk" TEXT DEFAULT '#1F2937',
    "themeMuted" TEXT DEFAULT '#64748B',
    "themeAccent" TEXT DEFAULT '#F5A623',
    "themeAccentDark" TEXT DEFAULT '#D98A0B',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultTaxRate" DECIMAL(5,2),
    "defaultServiceChargeRate" DECIMAL(5,2),
    "quotationValidityDays" INTEGER NOT NULL DEFAULT 30,
    "quotationTerms" TEXT,
    "cancellationPolicy" TEXT,
    "invoicePaymentTerms" TEXT,
    "invoicePaymentInstructions" TEXT,
    "ratingTagline" TEXT,
    "paymentMethods" TEXT[],
    "docNumberPrefixes" JSONB,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "bankSwiftCode" TEXT,
    "bankBranch" TEXT,
    "bankAccountType" TEXT DEFAULT 'Current Account',
    "upiId" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "crm_users"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "crm_users"."User"("phoneE164");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "crm_users"."User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_lastActivity_idx" ON "crm_users"."User"("lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "crm_users"."VendorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_businessRegistrationNumber_key" ON "crm_users"."VendorProfile"("businessRegistrationNumber");

-- AddForeignKey
ALTER TABLE "crm_users"."User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "crm_users"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_users"."VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm_users"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

