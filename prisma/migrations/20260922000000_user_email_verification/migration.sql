-- Keep accounts created before this flow accessible.
UPDATE "User" SET "emailVerified" = true WHERE "role" = 'USAGER';

ALTER TABLE "User"
  ADD COLUMN "emailVerificationCodeHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationSentAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationAttempts" INTEGER NOT NULL DEFAULT 0;
