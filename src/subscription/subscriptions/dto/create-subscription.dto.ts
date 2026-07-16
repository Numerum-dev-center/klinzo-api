import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  qrCodeId: string;

  latitude: number;

  longitude: number;

  addressText: string;

  status: SubscriptionStatus;

  startDate: Date;

  nextBillingDate: Date;

  userId: bigint;

  offerId: bigint;
}