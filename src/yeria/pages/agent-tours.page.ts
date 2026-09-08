import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { getYeriaAssetUrl } from '../yeria.config';

export function createAgentToursListPage(tours: any[]): BaseView {
  const view = YeriaUI.createActionListView(
    'agent-tours-list',
    'Tournées de Collecte',
  ).setIntro(`${tours.length} tournée(s) répertoriée(s).`);

  if (tours.length === 0) {
    view.addAction(
      'empty',
      'Aucune tournée programmée',
      'Aucune tournée assignée pour le moment.',
      undefined,
      true,
    );
    return view;
  }

  for (const t of tours) {
    const date = t.scheduledDate
      ? new Date(t.scheduledDate).toLocaleDateString('fr-FR')
      : "Aujourd'hui";
    const vehicule = t.vehicle
      ? `Véhicule : ${t.vehicle.matricule} (${t.vehicle.type})`
      : 'Véhicule non assigné';

    view.addAction(
      `/tours/${t.trackingId}`,
      `${t.reference} (${t.status})`,
      `Date : ${date} • ${vehicule}\nCollectes enregistrées : ${t._count?.collectionEvents || 0}`,
      getYeriaAssetUrl('events-banner.jpg'),
    );
  }

  return view;
}

export function createAgentTourDetailPage(tour: any): BaseView {
  const date = tour.scheduledDate
    ? new Date(tour.scheduledDate).toLocaleDateString('fr-FR')
    : 'Date non définie';
  const card = YeriaUI.createCardView(
    `tour-detail-${tour.trackingId}`,
    `Tournée : ${tour.reference}`,
  )
    .setSubtitle(`Statut : ${tour.status} • Prévue le ${date}`)
    .setDescription(
      `Détail de la tournée opérationnelle. Utilisez le bouton ci-dessous pour démarrer ou clôturer cette tournée sur le terrain.`,
    )
    .setBadge(tour.status);

  if (tour.vehicle) {
    card.addStat('Véhicule', tour.vehicle.matricule);
    card.addStat('Capacité', `${tour.vehicle.capacity || 0} T`);
  }

  const eventsCount = tour.collectionEvents?.length || 0;
  card.addStat('Bacs collectés', `${eventsCount}`);

  if (tour.status === 'PLANNED') {
    card.addAction('Démarrer la tournée', 'POST', {
      href: `/tours/${tour.trackingId}/start`,
      variant: 'primary',
      icon: 'play',
    });
  } else if (tour.status === 'IN_PROGRESS') {
    card.addAction('Clôturer la tournée', 'POST', {
      href: `/tours/${tour.trackingId}/complete`,
      variant: 'secondary',
      icon: 'check',
    });
  }

  return card;
}

export function createAgentCollectionHistoryPage(events: any[]): BaseView {
  const view = YeriaUI.createActionListView(
    'agent-history-list',
    'Historique des Ramassages',
  ).setIntro(`${events.length} collecte(s) enregistrée(s).`);

  if (events.length === 0) {
    view.addAction(
      'empty',
      'Aucun ramassage',
      'Aucune collecte enregistrée pour le moment.',
      undefined,
      true,
    );
    return view;
  }

  for (const ev of events) {
    const executed = ev.executedAt
      ? new Date(ev.executedAt).toLocaleDateString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const sub = ev.subscription;
    const client = sub?.user
      ? `${sub.user.firstName} ${sub.user.lastName}`
      : 'Abonné';

    view.addAction(
      `/history/${ev.trackingId}`,
      `Bac : ${sub?.qrCodeId || 'N/A'} (${ev.status})`,
      `Date : ${executed} • Client : ${client}\nAdresse : ${sub?.addressText || 'Adresse non spécifiée'}`,
      getYeriaAssetUrl('tickets-pass.jpg'),
    );
  }

  return view;
}
