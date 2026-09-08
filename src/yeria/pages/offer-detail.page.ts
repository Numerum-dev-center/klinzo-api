import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { getYeriaAssetUrl } from '../yeria.config';

export function createOfferDetailPage(offer: any): BaseView {
  const prix = Number(offer.price || 0).toLocaleString('fr-FR');
  const zoneName = offer.zone
    ? `${offer.zone.name}, ${offer.zone.city}`
    : 'Zone non précisée';
  const collector = offer.collector?.companyName || 'Collecteur partenaire';

  const card = YeriaUI.createCardView(
    `offer-detail-${offer.trackingId}`,
    offer.name,
  )
    .setSubtitle(zoneName)
    .setDescription(
      `Formule de gestion des déchets pour vos locaux ou votre domicile. Bénéficiez d'un passage garanti et d'un QR code certifié sur votre bac pour chaque ramassage.`,
    )
    .setBadge(offer.wasteType || 'Ordures ménagères')
    .setImage(getYeriaAssetUrl('client-hero.jpg'), offer.name);

  card.addStat('Tarif', `${prix} FCFA`);
  card.addStat('Fréquence', offer.frequency || 'Hebdomadaire');
  card.addStat('Zone', offer.zone?.city || 'Disponible');

  card.addSection(
    'Caractéristiques du service',
    `• Déchets acceptés : ${offer.wasteType || 'Standard'}\n• Collecteur agréé : ${collector}\n• Traçabilité par scan QR à chaque passage\n• Facturation transparente`,
  );

  if (offer.collector?.contactPhone) {
    card.addSection(
      'Assistance Collecteur',
      `Tél : ${offer.collector.contactPhone}`,
    );
  }

  card.addAction('Souscrire à cette formule', 'GET', {
    href: `/offers/${offer.trackingId}/subscribe`,
    variant: 'primary',
    icon: 'check',
  });

  return card;
}
