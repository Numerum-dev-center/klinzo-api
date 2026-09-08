import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { UserEntity } from '../../user/users/entities/user.entity';
import { getYeriaAssetUrl } from '../yeria.config';

export function createMySubscriptionsLookupForm(): BaseView {
  return YeriaUI.createFormView(
    'my-subscriptions-lookup',
    'Mes Abonnements Klinzo',
  )
    .setIntro(
      "Entrez votre adresse email ou votre identifiant d'abonnement pour retrouver vos contrats et QR codes de bac.",
    )
    .addEmailField(
      'email',
      'Adresse Email utilisée lors de la souscription',
      false,
    )
    .addTextField(
      'subscriptionId',
      'Ou numéro de souscription / Code QR bac',
      false,
    )
    .submitButton('Retrouver mes abonnements', 'POST', '/my-subscriptions');
}

export function createMySubscriptionsListPage(
  subscriptions: any[],
  user?: UserEntity,
): BaseView {
  const userGreeting = user
    ? `Bonjour ${[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Client'} ! `
    : '';

  const view = YeriaUI.createActionListView(
    'my-subscriptions-list',
    'Mes Abonnements & Bacs',
  ).setIntro(
    subscriptions.length > 0
      ? `${userGreeting}Retrouvez vos abonnements de collecte en cours et le QR code officiel de vos bacs.`
      : `${userGreeting}Vous n'avez pas encore d'abonnement actif pour le moment.`,
  );

  if (subscriptions.length === 0) {
    view.addAction(
      '/offers',
      'Découvrir nos offres',
      'Consulter les formules disponibles et activer votre collecte de déchets',
      getYeriaAssetUrl('events-banner.jpg'),
      false,
    );
    return view;
  }

  for (const sub of subscriptions) {
    const offerName = sub.offer?.name || 'Abonnement Déchets';
    const nextDate = sub.nextBillingDate
      ? new Date(sub.nextBillingDate).toLocaleDateString('fr-FR')
      : '';
    const status = sub.status || 'ACTIVE';

    view.addAction(
      `/subscription/${sub.trackingId}`,
      `${offerName} (${status})`,
      `Adresse : ${sub.addressText || 'Adresse'} • Prochaine facturation : ${nextDate}\nQR Bac : ${sub.qrCodeId}`,
      getYeriaAssetUrl('tickets-pass.jpg'),
    );
  }

  return view;
}
