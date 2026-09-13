-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_auth";

-- CreateEnum
CREATE TYPE "crm_auth"."OtpType" AS ENUM ('login', 'passwordReset', 'emailVerification');

-- CreateTable
CREATE TABLE "crm_auth"."Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "type" "crm_auth"."OtpType" NOT NULL DEFAULT 'login',
    "email" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Otp_userId_type_idx" ON "crm_auth"."Otp"("userId", "type");

-- CreateIndex
CREATE INDEX "Otp_email_idx" ON "crm_auth"."Otp"("email");

-- CreateIndex
CREATE INDEX "Otp_expiresAt_idx" ON "crm_auth"."Otp"("expiresAt");

