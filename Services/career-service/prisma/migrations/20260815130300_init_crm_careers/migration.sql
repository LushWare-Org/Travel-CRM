-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_careers";

-- CreateEnum
CREATE TYPE "crm_careers"."CareerStatus" AS ENUM ('pending', 'under-review', 'shortlisted', 'rejected', 'hired');

-- CreateEnum
CREATE TYPE "crm_careers"."VacancyType" AS ENUM ('Full Time', 'Part Time', 'Contract', 'Temporary', 'Internship');

-- CreateEnum
CREATE TYPE "crm_careers"."VacancyStatus" AS ENUM ('active', 'closed', 'draft');

-- CreateTable
CREATE TABLE "crm_careers"."Career" (
    "id" TEXT NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "coverLetter" VARCHAR(2000) NOT NULL,
    "agreeTerms" BOOLEAN NOT NULL,
    "status" "crm_careers"."CareerStatus" NOT NULL DEFAULT 'pending',
    "adminNotes" VARCHAR(2000),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Career_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_careers"."Vacancy" (
    "id" TEXT NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "type" "crm_careers"."VacancyType" NOT NULL DEFAULT 'Full Time',
    "location" TEXT NOT NULL,
    "experienceMin" INTEGER NOT NULL DEFAULT 0,
    "status" "crm_careers"."VacancyStatus" NOT NULL DEFAULT 'draft',
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "closingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Career_email_idx" ON "crm_careers"."Career"("email");

-- CreateIndex
CREATE INDEX "Career_position_idx" ON "crm_careers"."Career"("position");

-- CreateIndex
CREATE INDEX "Career_status_idx" ON "crm_careers"."Career"("status");

-- CreateIndex
CREATE INDEX "Career_createdAt_idx" ON "crm_careers"."Career"("createdAt");

-- CreateIndex
CREATE INDEX "Vacancy_status_createdAt_idx" ON "crm_careers"."Vacancy"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Vacancy_position_idx" ON "crm_careers"."Vacancy"("position");

