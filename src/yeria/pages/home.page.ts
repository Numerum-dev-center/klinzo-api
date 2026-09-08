import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { UserEntity } from '../../user/users/entities/user.entity';
import { getYeriaAssetUrl } from '../yeria.config';

export function createHomePage(user?: UserEntity): BaseView {
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : '';
  const intro = userName
    ? `Ravi de vous revoir, ${userName} ! Gérez vos collectes de déchets, vos abonnements et accédez à vos QR codes de bac.`
    : "Bienvenue sur KLINZO ! Souscrivez facilement à un service de collecte des déchets ménagers ou d'entreprise et suivez vos ramassages en temps réel.";

  return YeriaUI.createActionListView('home', 'KLINZO Gestion Déchets')
    .setIntro(intro)
    .addAction(
      '/offers',
      'Offres & Formules de Collecte',
      'Découvrez nos offres adaptées à votre zone et souscrivez en quelques clics',
      getYeriaAssetUrl('events-banner.jpg'),
    )
    .addAction(
      '/my-subscriptions',
      'Mes Abonnements & QR Bacs',
      userName
        ? `Consultez vos abonnements actifs (${user?.email}) et vos QR codes de bac`
        : 'Retrouvez vos contrats de collecte et vos badges QR code',
      getYeriaAssetUrl('tickets-pass.jpg'),
    )
    .addAction(
      '/search',
      'Vérifier la couverture par zone',
      'Recherchez par ville ou commune pour voir les collecteurs disponibles',
      getYeriaAssetUrl('search-explore.jpg'),
    );
}
