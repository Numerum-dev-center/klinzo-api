import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDataDto {
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