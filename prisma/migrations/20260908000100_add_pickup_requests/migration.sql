-- CreateEnum
CREATE TYPE "PickupRequestStatus" AS ENUM ('NEW', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PickupRequest" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'NEW',
    "wasteType" TEXT NOT NULL,
    "addressText" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "preferredDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedPrice" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "userId" BIGINT NOT NULL,
    "collectorId" BIGINT NOT NULL,

    CONSTRAINT "PickupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickupRequest_trackingId_key" ON "PickupRequest"("trackingId");

-- CreateIndex
CREATE INDEX "PickupRequest_collectorId_status_createdAt_idx" ON "PickupRequest"("collectorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PickupRequest_userId_createdAt_idx" ON "PickupRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
