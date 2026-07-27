-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PENDING_PAYMENT');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" BIGSERIAL NOT NULL,
    "trackingId" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gpsLocation" geometry(Point, 4326),
    "addressText" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextBillingDate" TIMESTAMP(3),
    "userId" BIGINT NOT NULL,
    "offerId" BIGINT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_trackingId_key" ON "Subscription"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_qrCodeId_key" ON "Subscription"("qrCodeId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
