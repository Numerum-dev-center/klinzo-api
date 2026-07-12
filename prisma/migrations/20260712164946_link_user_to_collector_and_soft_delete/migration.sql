-- AlterTable
ALTER TABLE "User" ADD COLUMN     "collectorId" BIGINT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
