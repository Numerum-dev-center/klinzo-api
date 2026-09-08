import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { UserEntity } from '../../user/users/entities/user.entity';
import { getYeriaAssetUrl } from '../yeria.config';

export function createAgentDashboardPage(
  user: UserEntity,
  collector: any,
  kpis: {
    toursTotal: number;
    toursInProgress: number;
    scansToday: number;
  },
): BaseView {
  const agentName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Agent';
  const companyName = collector?.companyName || 'Société de Collecte';

  const card = YeriaUI.createCardView('agent-dashboard', 'Espace Agent Terrain')
    .setSubtitle(`${companyName} • Agent : ${agentName}`)
    .setDescription(
      `Console mobile de gestion de tournée et de collecte. Scannez les QR codes des bacs des abonnés, validez les ramassages et synchronisez les preuves GPS en temps réel.`,
    )
    .setBadge('AGENT')
    .setImage(
      getYeriaAssetUrl('organizer-header.jpg'),
      'Espace Opérations & Collectes Klinzo',
    );

  card.addStat('Tournées', `${kpis.toursTotal}`);
  card.addStat('En cours', `${kpis.toursInProgress}`);
  card.addStat('Ramassages validés', `${kpis.scansToday}`);

  card.addSection(
    'Actions prioritaires',
    "• Scanner un bac abonné sur place\n• Consulter mes tournées prévues\n• Démarrer / Clôturer une tournée\n• Bilan d'activité terrain",
  );

  return card;
}

export function createAgentMenuPage(collector: any): BaseView {
  return YeriaUI.createActionGridView('agent-menu', 'Menu Opérations Terrain')
    .setColumns(2)
    .setIntro(`Service de ramassage — ${collector?.companyName || 'Klinzo'}`)
    .addAction(
      '/scan',
      'Scanner Bac Déchets',
      'Scanner le QR code du bac et enregistrer la collecte avec preuve GPS',
      getYeriaAssetUrl('qr-scanner.jpg'),
    )
    .addAction(
      '/tours',
      'Mes Tournées',
      'Consulter les tournées planifiées et en cours de collecte',
      getYeriaAssetUrl('events-banner.jpg'),
    )
    .addAction(
      '/history',
      'Historique Ramassages',
      'Liste des bacs collectés et statuts de validation',
      getYeriaAssetUrl('finance-stats.jpg'),
    );
}
