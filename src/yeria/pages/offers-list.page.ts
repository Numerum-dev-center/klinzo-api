import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { getYeriaAssetUrl } from '../yeria.config';

export function createOffersListPage(offers: any[]): BaseView {
  const view = YeriaUI.createActionListView(
    'offers-list',
    'Offres de Collecte',
  ).setIntro(`${offers.length} formule(s) de collecte disponible(s).`);

  if (offers.length === 0) {
    view.addAction(
      'empty',
      'Aucune offre disponible',
      'Nos collecteurs étendent progressivement leurs zones. Revenez bientôt !',
      undefined,
      true,
    );
    return view;
  }

  for (const offer of offers.slice(0, 30)) {
    const prix = Number(offer.price || 0).toLocaleString('fr-FR');
    const freq = offer.frequency || 'Régulière';
    const waste = offer.wasteType || 'Tous déchets';
    const zoneName = offer.zone
      ? `${offer.zone.name} (${offer.zone.city})`
      : 'Zone générale';
    const collectorName = offer.collector?.companyName
      ? ` • ${offer.collector.companyName}`
      : '';

    view.addAction(
      `/offers/${offer.trackingId}`,
      offer.name,
      `${prix} FCFA • ${freq} • ${waste}\nZone : ${zoneName}${collectorName}`,
      getYeriaAssetUrl('client-hero.jpg'),
    );
  }

  return view;
}
