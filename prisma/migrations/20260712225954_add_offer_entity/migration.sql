-- CreateTable
CREATE TABLE "Offer" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "wasteType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collectorId" BIGINT NOT NULL,
    "zoneId" BIGINT NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_trackingId_key" ON "Offer"("trackingId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
