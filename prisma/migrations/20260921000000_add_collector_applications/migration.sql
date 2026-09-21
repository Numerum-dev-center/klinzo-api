CREATE TYPE "CollectorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CollectorApplication" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "type" "CollectorType" NOT NULL,
    "adresse" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "CollectorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "collectorTrackingId" TEXT,
    "userTrackingId" TEXT,
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "CollectorApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectorApplication_trackingId_key" ON "CollectorApplication"("trackingId");
CREATE UNIQUE INDEX "CollectorApplication_inviteTokenHash_key" ON "CollectorApplication"("inviteTokenHash");
CREATE INDEX "CollectorApplication_status_createdAt_idx" ON "CollectorApplication"("status", "createdAt");
CREATE INDEX "CollectorApplication_contactEmail_idx" ON "CollectorApplication"("contactEmail");
