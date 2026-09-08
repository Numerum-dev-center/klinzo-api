export class OfferEntity {
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  price: number;
  frequency: string;
  wasteType: string;
  isActive: boolean;

  constructor(partial: Partial<OfferEntity>) {
    this.trackingId = partial.trackingId!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
    this.name = partial.name!;
    this.price = partial.price!;
    this.frequency = partial.frequency!;
    this.wasteType = partial.wasteType!;
    this.isActive = partial.isActive!;
  }
}
