-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CollectorType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'MUNICIPALITY', 'ASSOCIATION');

-- CreateTable
CREATE TABLE "Collector" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "type" "CollectorType" NOT NULL,
    "adresse" TEXT NOT NULL,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "payoutAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collector_trackingId_key" ON "Collector"("trackingId");
