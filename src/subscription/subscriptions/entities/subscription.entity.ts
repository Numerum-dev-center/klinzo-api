export class SubscriptionEntity {
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

  constructor(partial: Partial<SubscriptionEntity>) {
    Object.assign(this, partial);
  }
}
