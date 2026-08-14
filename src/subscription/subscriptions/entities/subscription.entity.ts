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
  // Résumés optionnels, présents uniquement quand la requête d'origine a chargé les relations
  // (ex: findAllByCollector) — évite un aller-retour supplémentaire côté frontend.
  user?: { trackingId: string; firstName: string; lastName: string; email: string; phone: string };
  offer?: { trackingId: string; name: string; price: number; frequency: string; wasteType: string };

  constructor(partial: Partial<SubscriptionEntity>) {
    Object.assign(this, partial);
  }
}
