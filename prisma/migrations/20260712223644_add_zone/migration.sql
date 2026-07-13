CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "Zone" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "polygonPostgis" geometry(Polygon, 4326),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collectorId" BIGINT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_trackingId_key" ON "Zone"("trackingId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
