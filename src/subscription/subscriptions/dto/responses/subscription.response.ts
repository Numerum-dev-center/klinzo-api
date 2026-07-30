export class SubscriptionResponse {
  id: bigint;
  trackingId: string;

  qrCodeId: string;

  addressText: string;

  status: string;

  startDate: Date;

  nextBillingDate: Date;

  userId: bigint;

  offerId: bigint;

  createdAt: Date;
  updatedAt: Date;
}