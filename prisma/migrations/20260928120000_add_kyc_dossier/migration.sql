CREATE TYPE "KycDocumentType" AS ENUM ('IDENTITY', 'REGISTRATION', 'VEHICLE', 'OTHER');
CREATE TABLE "KycDocument" (
  "id" BIGSERIAL NOT NULL, "trackingId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" "KycDocumentType" NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL, "uploadedBy" TEXT NOT NULL, "collectorId" BIGINT NOT NULL,
  CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "KycDecision" (
  "id" BIGSERIAL NOT NULL, "trackingId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "KycStatus" NOT NULL, "reason" TEXT NOT NULL, "decidedBy" TEXT NOT NULL, "collectorId" BIGINT NOT NULL,
  CONSTRAINT "KycDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KycDocument_trackingId_key" ON "KycDocument"("trackingId");
CREATE INDEX "KycDocument_collectorId_createdAt_idx" ON "KycDocument"("collectorId", "createdAt");
CREATE UNIQUE INDEX "KycDecision_trackingId_key" ON "KycDecision"("trackingId");
CREATE INDEX "KycDecision_collectorId_createdAt_idx" ON "KycDecision"("collectorId", "createdAt");
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycDecision" ADD CONSTRAINT "KycDecision_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
