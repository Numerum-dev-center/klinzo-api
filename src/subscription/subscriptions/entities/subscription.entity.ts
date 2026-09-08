export class SubscriptionEntity {
  trackingId: string;
  qrCodeId: string;
  addressText: string;
  status: string;
  startDate: Date;
  nextBillingDate: Date;
  createdAt: Date;
  updatedAt: Date;
  // Résumés optionnels, présents uniquement quand la requête d'origine a chargé les relations
  // (ex: findAllByCollector) — évite un aller-retour supplémentaire côté frontend.
  user?: {
    trackingId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  offer?: {
    trackingId: string;
    name: string;
    price: number;
    frequency: string;
    wasteType: string;
  };

  constructor(partial: Partial<SubscriptionEntity>) {
    this.trackingId = partial.trackingId!;
    this.qrCodeId = partial.qrCodeId!;
    this.addressText = partial.addressText!;
    this.status = partial.status!;
    this.startDate = partial.startDate!;
    this.nextBillingDate = partial.nextBillingDate!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
    this.user = partial.user;
    this.offer = partial.offer;
  }
}
