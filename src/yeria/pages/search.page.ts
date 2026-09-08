import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { getYeriaAssetUrl } from '../yeria.config';

export function createSearchZonePage(cities: string[]): BaseView {
  const form = YeriaUI.createFormView(
    'search-zone',
    'Vérifier la Couverture de Collecte',
  )
    .setIntro(
      'Vérifiez si les services Klinzo sont déjà disponibles dans votre commune ou quartier.',
    )
    .addTextField('keyword', 'Nom du quartier ou commune', false);

  if (cities && cities.length > 0) {
    const cityOptions = cities.map((c) => ({ label: c, value: c }));
    form.addSelectField('city', 'Ville', false, cityOptions);
  }

  form.submitButton('Vérifier les zones couvertes', 'POST', '/search');

  return form;
}

export function createSearchResultsPage(
  zones: any[],
  criteria?: string,
): BaseView {
  const view = YeriaUI.createActionListView(
    'search-results',
    'Zones de collecte desservies',
  ).setIntro(
    zones.length > 0
      ? `${zones.length} zone(s) couverte(s) ${criteria ? `pour "${criteria}"` : ''}`
      : 'Aucune zone de collecte active ne correspond actuellement à vos critères.',
  );

  for (const z of zones.slice(0, 20)) {
    const offersCount = z.offers?.length || 0;
    view.addAction(
      `/offers?zone=${z.trackingId}`,
      `${z.name} — ${z.city}`,
      `Zone active • ${offersCount} formule(s) disponible(s)`,
      getYeriaAssetUrl('search-explore.jpg'),
    );
  }

  return view;
}
