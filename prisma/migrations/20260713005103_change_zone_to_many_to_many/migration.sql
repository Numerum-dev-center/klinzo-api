/*
  Warnings:

  - You are about to drop the column `collectorId` on the `Zone` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_collectorId_fkey";

-- AlterTable
ALTER TABLE "Zone" DROP COLUMN "collectorId";

-- CreateTable
CREATE TABLE "CollectorZone" (
    "collectorId" BIGINT NOT NULL,
    "zoneId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectorZone_pkey" PRIMARY KEY ("collectorId","zoneId")
);

-- AddForeignKey
ALTER TABLE "CollectorZone" ADD CONSTRAINT "CollectorZone_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorZone" ADD CONSTRAINT "CollectorZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
