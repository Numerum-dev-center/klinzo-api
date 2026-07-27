export class SubscriptionResponseDto {
  trackingId: string;

  qrCodeId: string;

  addressText: string;

  status: string;

  startDate: Date;

  nextBillingDate: Date;

  createdAt: Date;

  updatedAt: Date;

  user: {
    trackingId: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  offer: {
    trackingId: string;
    name: string;
    price: number;
    frequency: string;
  };
}