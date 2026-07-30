/*
  Warnings:

  - The primary key for the `Subscription` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'VALIDATED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialDocumentType" AS ENUM ('PAYOUT', 'COLLECTOR_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "FinancialDocumentStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_pkey",
ALTER COLUMN "id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Tour" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "status" "TourStatus" NOT NULL DEFAULT 'PLANNED',
    "vehicleId" BIGINT NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEvent" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "gpsProof" geography(Point,4326),
    "photoUrl" TEXT,
    "qrScanData" TEXT,
    "autoValidationDeadline" TIMESTAMP(3),
    "disputeReason" TEXT,
    "tourId" BIGINT NOT NULL,
    "subscriptionId" BIGINT NOT NULL,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "collectorId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "collectionEventId" BIGINT NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformCommission" DOUBLE PRECISION NOT NULL,
    "paymentGatewayRef" TEXT,
    "status" TEXT NOT NULL,
    "invoicePdfUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionId" BIGINT NOT NULL,
    "financialDocumentId" BIGINT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialDocument" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "FinancialDocumentType" NOT NULL,
    "status" "FinancialDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "collectorId" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "documentUrl" TEXT,
    "dueDate" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,

    CONSTRAINT "FinancialDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_trackingId_key" ON "Tour"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_reference_key" ON "Tour"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEvent_trackingId_key" ON "CollectionEvent"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_trackingId_key" ON "Rating"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_collectionEventId_key" ON "Rating"("collectionEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_trackingId_key" ON "Transaction"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialDocument_trackingId_key" ON "FinancialDocument"("trackingId");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_collectionEventId_fkey" FOREIGN KEY ("collectionEventId") REFERENCES "CollectionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_financialDocumentId_fkey" FOREIGN KEY ("financialDocumentId") REFERENCES "FinancialDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialDocument" ADD CONSTRAINT "FinancialDocument_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
