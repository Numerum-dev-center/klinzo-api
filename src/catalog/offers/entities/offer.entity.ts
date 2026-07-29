export class OfferEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  price: number;
  frequency: string;
  wasteType: string;
  isActive: boolean;
  collectorId: bigint;
  zoneId: bigint;

  constructor(partial: Partial<OfferEntity>) {
    Object.assign(this, partial);
  }
}
