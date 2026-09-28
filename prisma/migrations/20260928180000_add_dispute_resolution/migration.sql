CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED');
CREATE TYPE "DisputeDecision" AS ENUM ('USER_FAVORED', 'COLLECTOR_FAVORED', 'INCONCLUSIVE');
CREATE TYPE "DisputeMeasure" AS ENUM ('NONE', 'WARNING_COLLECTOR', 'SUSPEND_COLLECTOR');
CREATE TYPE "DisputeHistoryAction" AS ENUM ('OPENED', 'REVIEW_STARTED', 'RESOLVED');

CREATE TABLE "DisputeCase" (
  "id" BIGSERIAL NOT NULL,
  "trackingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "decision" "DisputeDecision",
  "resolutionReason" TEXT,
  "measure" "DisputeMeasure" NOT NULL DEFAULT 'NONE',
  "assignedTo" TEXT,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "collectionEventId" BIGINT NOT NULL,
  CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisputeHistory" (
  "id" BIGSERIAL NOT NULL,
  "trackingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" "DisputeHistoryAction" NOT NULL,
  "fromStatus" "DisputeStatus",
  "toStatus" "DisputeStatus" NOT NULL,
  "decision" "DisputeDecision",
  "reason" TEXT,
  "measure" "DisputeMeasure",
  "actorTrackingId" TEXT NOT NULL,
  "disputeCaseId" BIGINT NOT NULL,
  CONSTRAINT "DisputeHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisputeCase_trackingId_key" ON "DisputeCase"("trackingId");
CREATE UNIQUE INDEX "DisputeCase_collectionEventId_key" ON "DisputeCase"("collectionEventId");
CREATE INDEX "DisputeCase_status_createdAt_idx" ON "DisputeCase"("status", "createdAt");
CREATE UNIQUE INDEX "DisputeHistory_trackingId_key" ON "DisputeHistory"("trackingId");
CREATE INDEX "DisputeHistory_disputeCaseId_createdAt_idx" ON "DisputeHistory"("disputeCaseId", "createdAt");
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_collectionEventId_fkey" FOREIGN KEY ("collectionEventId") REFERENCES "CollectionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeHistory" ADD CONSTRAINT "DisputeHistory_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "DisputeCase" ("trackingId", "createdAt", "updatedAt", "status", "collectionEventId")
SELECT gen_random_uuid()::text, ce."updatedAt", ce."updatedAt", 'OPEN'::"DisputeStatus", ce."id"
FROM "CollectionEvent" ce
WHERE ce."status" = 'DISPUTED'::"CollectionStatus";

INSERT INTO "DisputeHistory" ("trackingId", "createdAt", "action", "toStatus", "reason", "actorTrackingId", "disputeCaseId")
SELECT gen_random_uuid()::text, dc."createdAt", 'OPENED'::"DisputeHistoryAction", 'OPEN'::"DisputeStatus", ce."disputeReason", 'SYSTEM_MIGRATION', dc."id"
FROM "DisputeCase" dc
JOIN "CollectionEvent" ce ON ce."id" = dc."collectionEventId";
