import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../shared/prisma/prisma.service';
import { UserEntity } from '../user/users/entities/user.entity';
import { KycStatus, Role, TourStatus } from '@prisma/client';
import { YeriaUI } from '@numerum-tech/yeriasdk';
import { getYeriaPublicApp, getYeriaAgentApp } from './yeria.config';
import { createHomePage } from './pages/home.page';
import { createOffersListPage } from './pages/offers-list.page';
import { createOfferDetailPage } from './pages/offer-detail.page';
import { createSubscribeFormPage } from './pages/subscribe-form.page';
import { createSubscriptionQRPage } from './pages/subscription-qr.page';
import { createMySubscriptionsListPage } from './pages/my-subscriptions.page';
import {
  createSearchZonePage,
  createSearchResultsPage,
} from './pages/search.page';
import {
  createAgentDashboardPage,
  createAgentMenuPage,
} from './pages/agent-dashboard.page';
import {
  createAgentScanSelectTourPage,
  createAgentQRScannerPage,
  createAgentScanResultPage,
} from './pages/agent-scan.page';
import {
  createAgentToursListPage,
  createAgentTourDetailPage,
  createAgentCollectionHistoryPage,
} from './pages/agent-tours.page';

@Injectable()
export class YeriaService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly subscribableOfferWhere = {
    isActive: true,
    collector: {
      isActive: true,
      kycStatus: KycStatus.APPROVED,
    },
  };

  private get publicApp() {
    return getYeriaPublicApp();
  }

  private get agentApp() {
    return getYeriaAgentApp();
  }

  // =========================================================================
  // SECTION 1 : SERVICE PUBLIC YERIA (Clients, Découverte & Abonnements)
  // =========================================================================

  // 1. Home / Point d'entrée Public
  getHome(user?: UserEntity) {
    const view = createHomePage(user);
    return this.publicApp.serve(view);
  }

  // 2. Liste des offres disponibles
  async getOffersList(zoneTrackingId?: string) {
    const where: any = { ...this.subscribableOfferWhere };
    if (zoneTrackingId) {
      where.zone = { trackingId: zoneTrackingId };
    }

    const offers = await this.prisma.offer.findMany({
      where,
      include: {
        collector: true,
        zone: true,
      },
      orderBy: { price: 'asc' },
      take: 50,
    });

    const view = createOffersListPage(offers);
    return this.publicApp.serve(view);
  }

  // 3. Détail d'une offre
  async getOfferDetail(trackingId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { trackingId, ...this.subscribableOfferWhere },
      include: {
        collector: true,
        zone: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre de collecte indisponible');
    }

    const view = createOfferDetailPage(offer);
    return this.publicApp.serve(view);
  }

  // 4. Formulaire de souscription (GET)
  async getSubscribeForm(offerTrackingId: string, user?: UserEntity) {
    const offer = await this.prisma.offer.findFirst({
      where: { trackingId: offerTrackingId, ...this.subscribableOfferWhere },
      include: {
        collector: true,
        zone: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre de collecte indisponible');
    }

    const view = createSubscribeFormPage(offer, user);
    return this.publicApp.serve(view);
  }

  // 4b. Soumission de souscription (POST) -> Retourne le QR code du Bac
  async submitSubscription(
    offerTrackingId: string,
    body: {
      subscriberName?: string;
      subscriberEmail?: string;
      subscriberPhone?: string;
      addressText?: string;
      latitude?: string | number;
      longitude?: string | number;
    },
    user?: UserEntity,
  ) {
    const offer = await this.prisma.offer.findFirst({
      where: { trackingId: offerTrackingId, ...this.subscribableOfferWhere },
      include: {
        collector: true,
        zone: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre de collecte indisponible');
    }

    let targetUser: any = user;
    const email = user?.email || body.subscriberEmail || 'client@yeria.app';
    const phone = user?.phone || body.subscriberPhone || '0000000000';
    const nameParts = (body.subscriberName || 'Client Yeria').split(' ');
    const firstName = user?.firstName || nameParts[0] || 'Client';
    const lastName = user?.lastName || nameParts.slice(1).join(' ') || 'Yeria';

    if (!targetUser) {
      targetUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!targetUser) {
        const dummyPassword = await bcrypt.hash(
          crypto.randomBytes(32).toString('hex'),
          10,
        );
        targetUser = await this.prisma.user.create({
          data: {
            email,
            password: dummyPassword,
            firstName,
            lastName,
            phone,
            role: Role.USAGER,
            emailVerified: true,
            isActive: true,
          },
        });
      }
    } else {
      const dbUser = await this.prisma.user.findUnique({
        where: { trackingId: targetUser.trackingId },
      });
      if (dbUser) targetUser = dbUser;
    }

    // GAP-08: idempotency — return existing active subscription
    const existingSub = await this.prisma.subscription.findFirst({
      where: {
        userId: targetUser.id,
        offerId: offer.id,
        status: { not: 'CANCELLED' },
      },
      include: { offer: true, user: true },
    });
    if (existingSub) {
      const view = await createSubscriptionQRPage(existingSub);
      return this.publicApp.serve(view);
    }

    const addressText = body.addressText || 'Adresse de collecte';
    const lat = Number(body.latitude) || 5.35995;
    const lng = Number(body.longitude) || -4.00826;
    const qrCodeId = `KLZ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "Subscription"
      (
        "qrCodeId",
        "gpsLocation",
        "addressText",
        "status",
        "startDate",
        "nextBillingDate",
        "userId",
        "offerId",
        "trackingId",
        "createdAt",
        "updatedAt"
      )
      VALUES
      (
        ${qrCodeId},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${addressText},
        'ACTIVE'::"SubscriptionStatus",
        ${now},
        ${nextMonth},
        ${targetUser.id},
        ${offer.id},
        gen_random_uuid(),
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const createdSub = result[0];
    const fullSub = await this.prisma.subscription.findUnique({
      where: { id: createdSub.id },
      include: {
        offer: true,
        user: true,
      },
    });

    // GAP-25: schedule initial collection tour
    this.scheduleInitialCollections(createdSub.id, offer).catch(() => {});

    const view = await createSubscriptionQRPage(fullSub || createdSub);
    return this.publicApp.serve(view);
  }

  // 5. Affichage d'un QR code de bac / souscription
  async getSubscriptionQR(trackingId: string, user?: UserEntity) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        OR: [{ trackingId }, { qrCodeId: trackingId }],
      },
      include: {
        offer: true,
        user: true,
      },
    });

    if (!sub) {
      throw new NotFoundException('Abonnement / QR code introuvable');
    }
    if (!user || sub.user.trackingId !== user.trackingId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres abonnements.',
      );
    }

    const view = await createSubscriptionQRPage(sub);
    return this.publicApp.serve(view);
  }

  // 6. Formulaire de recherche de zone (GET)
  async getSearchForm() {
    const zones = await this.prisma.zone.findMany({
      where: { isActive: true },
      select: { city: true },
    });
    const cities = Array.from(
      new Set(
        zones
          .map((z) => z.city)
          .filter((city): city is string => Boolean(city)),
      ),
    );
    const view = createSearchZonePage(cities);
    return this.publicApp.serve(view);
  }

  // 6b. Exécution de la recherche de zones (POST)
  async executeSearch(body: { keyword?: string; city?: string }) {
    const where: any = { isActive: true };

    if (body.keyword) {
      where.OR = [
        { name: { contains: body.keyword, mode: 'insensitive' } },
        { city: { contains: body.keyword, mode: 'insensitive' } },
      ];
    }
    if (body.city) {
      where.city = { contains: body.city, mode: 'insensitive' };
    }

    const zones = await this.prisma.zone.findMany({
      where,
      include: {
        offers: true,
      },
      take: 20,
    });

    const criteria = [body.keyword, body.city].filter(Boolean).join(', ');
    const view = createSearchResultsPage(zones, criteria);
    return this.publicApp.serve(view);
  }

  // 7. Mes Abonnements (GET)
  async getMySubscriptions(user?: UserEntity) {
    if (user) {
      const dbUser = await this.prisma.user.findUnique({
        where: { trackingId: user.trackingId },
      });

      const subscriptions = dbUser
        ? await this.prisma.subscription.findMany({
            where: { userId: dbUser.id },
            include: {
              offer: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : [];

      const view = createMySubscriptionsListPage(subscriptions, user);
      return this.publicApp.serve(view);
    }

    throw new UnauthorizedException(
      'Authentification Yeria requise pour consulter vos abonnements.',
    );
  }

  // 7b. Consultation de mes abonnements par filtre (POST)
  async findMySubscriptions(
    _body: { email?: string; subscriptionId?: string },
    user?: UserEntity,
  ) {
    if (user) {
      return this.getMySubscriptions(user);
    }

    // GAP-12: require authentication — no anonymous email lookup
    return this.publicApp.serveError({
      code: 'auth.required',
      status: 401,
      message:
        'Veuillez vous connecter via Yeria pour consulter vos abonnements.',
    });
  }

  // =========================================================================
  // SECTION 2 : SERVICE PRIVÉ AGENTS TERRAIN (Tournées, Scanner QR Bac, Opérations)
  // =========================================================================

  // 1. Dashboard Agent Terrain (GET /yeria/agent)
  async getAgentDashboard(user: UserEntity, collector: any) {
    const collectorId = collector?.id;

    let toursTotal = 0;
    let toursInProgress = 0;
    let scansToday = 0;

    if (collectorId) {
      const whereCollector = { vehicle: { collectorId } };
      toursTotal = await this.prisma.tour.count({ where: whereCollector });
      toursInProgress = await this.prisma.tour.count({
        where: { ...whereCollector, status: TourStatus.IN_PROGRESS },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      scansToday = await this.prisma.collectionEvent.count({
        where: {
          executedAt: { gte: today },
          tour: { vehicle: { collectorId } },
        },
      });
    }

    const view = createAgentDashboardPage(user, collector, {
      toursTotal,
      toursInProgress,
      scansToday,
    });
    return this.agentApp.serve(view);
  }

  // 2. Menu d'actions de l'Agent Terrain (GET /yeria/agent/menu)
  getAgentMenu(collector: any) {
    const view = createAgentMenuPage(collector);
    return this.agentApp.serve(view);
  }

  // 3. Tournées : Liste des tournées (GET /yeria/agent/tours)
  async getAgentTours(collector: any) {
    const collectorId = this.requireAgentCollectorId(collector);
    const where = { vehicle: { collectorId } };

    const tours = await this.prisma.tour.findMany({
      where,
      include: {
        vehicle: true,
        _count: { select: { collectionEvents: true } },
      },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
    });

    const view = createAgentToursListPage(tours);
    return this.agentApp.serve(view);
  }

  // 3b. Détail d'une tournée (GET /yeria/agent/tours/:id)
  async getAgentTourDetail(trackingId: string, collector: any) {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: {
        vehicle: true,
        collectionEvents: {
          include: { subscription: true },
          take: 10,
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tournée introuvable');
    }
    this.assertAgentCollectorScope(tour.vehicle.collectorId, collector);

    const view = createAgentTourDetailPage(tour);
    return this.agentApp.serve(view);
  }

  // 3c. Démarrer une tournée (POST /yeria/agent/tours/:id/start)
  async startTour(trackingId: string, collector: any) {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: { vehicle: true },
    });
    if (!tour) throw new NotFoundException('Tournée introuvable');
    this.assertAgentCollectorScope(tour.vehicle.collectorId, collector);
    if (tour.status !== TourStatus.PLANNED) {
      throw new BadRequestException('La tournée doit être planifiée.');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      },
      include: { vehicle: true },
    });

    const view = createAgentTourDetailPage(updated);
    return this.agentApp.serve(view);
  }

  // 3d. Clôturer une tournée (POST /yeria/agent/tours/:id/complete)
  async completeTour(trackingId: string, collector: any) {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: { vehicle: true },
    });
    if (!tour) throw new NotFoundException('Tournée introuvable');
    this.assertAgentCollectorScope(tour.vehicle.collectorId, collector);
    if (tour.status !== TourStatus.IN_PROGRESS) {
      throw new BadRequestException('La tournée doit être en cours.');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.COMPLETED,
        actualEndTime: new Date(),
      },
      include: { vehicle: true },
    });

    const view = createAgentTourDetailPage(updated);
    return this.agentApp.serve(view);
  }

  // 4. Scanner QR Bac : Sélection de tournée (GET /yeria/agent/scan)
  async getScanSelectTour(collector: any) {
    const collectorId = collector?.id;
    const tours = collectorId
      ? await this.prisma.tour.findMany({
          where: {
            vehicle: { collectorId },
            status: { in: [TourStatus.PLANNED, TourStatus.IN_PROGRESS] },
          },
          include: { vehicle: true },
          orderBy: { scheduledDate: 'asc' },
        })
      : [];

    const view = createAgentScanSelectTourPage(tours);
    return this.agentApp.serve(view);
  }

  // 4b. Scanner QR Bac : Ouverture de la caméra (POST /yeria/agent/scan)
  async openAgentScanner(body: { tourTrackingId?: string }, collector: any) {
    let tourTrackingId = body.tourTrackingId;
    let tourRef = 'Collecte du jour';

    if (tourTrackingId) {
      const tour = await this.prisma.tour.findUnique({
        where: { trackingId: tourTrackingId },
        include: { vehicle: true },
      });
      if (tour) {
        this.assertAgentCollectorScope(tour.vehicle.collectorId, collector);
        tourRef = tour.reference;
      } else {
        throw new NotFoundException('Tournée introuvable');
      }
    } else {
      // Tournée générique
      tourTrackingId = 'active-tour';
    }

    const view = createAgentQRScannerPage(tourTrackingId, tourRef);
    return this.agentApp.serve(view);
  }

  // 4c. Scanner QR Bac : Validation du scan sur place (POST /yeria/agent/scan/:tourTrackingId)
  async validateAgentScannedQR(
    tourTrackingId: string,
    body: {
      qrData: string;
      gpsLat?: number;
      gpsLng?: number;
      photoUrl?: string;
    },
    user?: UserEntity,
    collector?: any,
  ) {
    const cleanQr = body.qrData ? body.qrData.trim() : '';

    // Recherche de l'abonnement par code QR ou trackingId
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [{ qrCodeId: cleanQr }, { trackingId: cleanQr }],
      },
      include: {
        offer: true,
        user: true,
      },
    });

    if (!subscription) {
      const view = createAgentScanResultPage(
        false,
        `Le QR code scanné [${cleanQr}] ne correspond à aucun bac abonné chez Klinzo.`,
      );
      return this.agentApp.serve(view);
    }

    if (subscription.status !== 'ACTIVE') {
      const view = createAgentScanResultPage(
        false,
        `Ce bac est actuellement [${subscription.status}]. La collecte ne peut pas être effectuée.`,
        {
          qrCodeId: subscription.qrCodeId,
          clientNom: `${subscription.user?.firstName} ${subscription.user?.lastName}`,
          adresse: subscription.addressText,
          statut: subscription.status,
        },
      );
      return this.agentApp.serve(view);
    }

    const agentCollectorId = this.requireAgentCollectorId(collector);
    if (subscription.offer.collectorId !== agentCollectorId) {
      const view = createAgentScanResultPage(
        false,
        "Ce bac n'appartient pas à votre collecteur.",
      );
      return this.agentApp.serve(view);
    }

    // Trouver ou créer une tournée associée
    let tour: any = null;
    if (tourTrackingId && tourTrackingId !== 'active-tour') {
      tour = await this.prisma.tour.findUnique({
        where: { trackingId: tourTrackingId },
        include: { vehicle: true },
      });
      if (tour)
        this.assertAgentCollectorScope(tour.vehicle.collectorId, collector);
    }

    if (!tour) {
      // Chercher une tournée en cours pour le collecteur
      const collectorId = agentCollectorId;
      tour = await this.prisma.tour.findFirst({
        where: {
          vehicle: { collectorId },
          status: TourStatus.IN_PROGRESS,
        },
      });

      if (!tour) {
        // GAP-17: never auto-create tours — return a clear error
        const view = createAgentScanResultPage(
          false,
          'Aucune tournée en cours. Sélectionnez une tournée valide.',
        );
        return this.agentApp.serve(view);
      }
    }

    const executedAt = new Date();
    const autoDeadline = new Date(executedAt.getTime() + 48 * 3600 * 1000);
    const parsedLat = Number(body.gpsLat);
    const parsedLng = Number(body.gpsLng);
    const hasGpsProof =
      Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
    if (!hasGpsProof && process.env.NODE_ENV === 'production') {
      const view = createAgentScanResultPage(
        false,
        'Position GPS obligatoire pour valider la collecte.',
      );
      return this.agentApp.serve(view);
    }
    const lat = hasGpsProof ? parsedLat : 5.35995;
    const lng = hasGpsProof ? parsedLng : -4.00826;

    // Enregistrer le passage de collecte (CollectionEvent)
    await this.prisma.$queryRaw`
      INSERT INTO "CollectionEvent" (
        "trackingId", "createdAt", "updatedAt", "status", "executedAt",
        "photoUrl", "qrScanData", "autoValidationDeadline", "tourId", "subscriptionId", "gpsProof"
      ) VALUES (
        gen_random_uuid(),
        NOW(),
        NOW(),
        'VALIDATED'::"CollectionStatus",
        ${executedAt},
        ${body.photoUrl || null},
        ${cleanQr},
        ${autoDeadline},
        ${tour.id},
        ${subscription.id},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    const clientNom = subscription.user
      ? `${subscription.user.firstName} ${subscription.user.lastName}`
      : 'Client Klinzo';

    const view = createAgentScanResultPage(
      true,
      `Bac collecté et scanné avec succès ! Preuve GPS enregistrée.`,
      {
        qrCodeId: subscription.qrCodeId,
        clientNom,
        formule: subscription.offer?.name,
        adresse: subscription.addressText,
        statut: 'VALIDÉ',
      },
    );

    return this.agentApp.serve(view);
  }

  // 5. Historique des collectes (GET /yeria/agent/history)
  async getAgentCollectionHistory(collector: any) {
    const collectorId = this.requireAgentCollectorId(collector);
    const where = { tour: { vehicle: { collectorId } } };

    const events = await this.prisma.collectionEvent.findMany({
      where,
      include: {
        subscription: { include: { user: true } },
      },
      orderBy: { executedAt: 'desc' },
      take: 30,
    });

    const view = createAgentCollectionHistoryPage(events);
    return this.agentApp.serve(view);
  }

  // GAP-09: Détail d'un événement de collecte (GET /yeria/agent/history/:id)
  async getAgentCollectionEventDetail(id: string, collector: any) {
    const event = await this.prisma.collectionEvent.findFirst({
      where: {
        OR: [{ trackingId: id }],
      },
      include: {
        subscription: { include: { offer: true, user: true } },
        tour: { include: { vehicle: true } },
        rating: true,
      },
    });

    if (!event) {
      const view = YeriaUI.createMessageView('event-not-found', 'Collecte introuvable')
        .setSeverity('error')
        .setBody("L'événement de collecte demandé est introuvable.");
      return this.agentApp.serve(view);
    }

    const sub = event.subscription;
    const client = sub?.user
      ? `${sub.user.firstName} ${sub.user.lastName}`
      : 'Client';
    const address = sub?.addressText || 'N/A';
    const offer = sub?.offer?.name || 'Abonnement';
    const statusLabel: Record<string, string> = {
      PENDING: 'En attente',
      VALIDATED: 'Validé',
      DISPUTED: 'Contesté',
      CANCELLED: 'Annulé',
    };

    const view = YeriaUI.createReaderView(`event-detail-${id}`, 'Détail de collecte')
      .addMarkdown(
        `**Client:** ${client}\n\n**Formule:** ${offer}\n\n**Adresse:** ${address}\n\n**Statut:** ${statusLabel[event.status] || event.status}\n\n**Date:** ${event.executedAt ? new Date(event.executedAt).toLocaleString('fr-FR') : 'N/A'}\n\n**QR Bac:** ${event.qrScanData || 'N/A'}\n\n**Note:** ${event.disputeReason || '-'}`,
      );

    return this.agentApp.serve(view);
  }

  // GAP-18: Demande de collecte ponctuelle (GET /yeria/requests/new)
  getOneOffRequestForm(user?: UserEntity) {
    const form = YeriaUI.createFormView('one-off-request', 'Demande ponctuelle de collecte')
      .setIntro('Planifiez une collecte unique en dehors de votre abonnement habituel.');
    form.addSelectField('wasteType', 'Type de déchet', true, [
      { label: 'Ordures ménagères', value: 'HOUSEHOLD' },
      { label: 'Encombrants', value: 'BULKY' },
      { label: 'Déchets verts', value: 'GREEN' },
      { label: 'Électroniques', value: 'ELECTRONIC' },
      { label: 'Autres', value: 'OTHER' },
    ]);
    form.addTextField('addressText', 'Adresse de collecte', true);
    form.addTextField('preferredDate', 'Date souhaitée (JJ/MM/AAAA)', false);
    form.addTextField('notes', 'Remarques (optionnel)', false);
    form.submitButton('Envoyer la demande', 'POST');
    if (user) {
      form.injectData({ addressText: '' });
    }
    return this.publicApp.serve(form);
  }

  async submitOneOffRequest(
    body: { wasteType?: string; addressText?: string; preferredDate?: string; notes?: string },
    user: UserEntity,
  ) {
    if (!body.wasteType || !body.addressText) {
      return this.publicApp.serveError({
        code: 'validation.failed',
        status: 400,
        message: 'Le type de déchet et l\'adresse sont obligatoires.',
      });
    }

    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    if (!dbUser) {
      return this.publicApp.serveError({ code: 'auth.required', status: 401, message: 'Utilisateur introuvable.' });
    }

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId: dbUser.id, status: 'ACTIVE' },
      include: { offer: { include: { collector: true } } },
    });

    const collector = activeSub?.offer?.collector
      ? await this.prisma.collector.findFirst({ where: { isActive: true } })
      : await this.prisma.collector.findFirst({ where: { isActive: true } });

    if (!collector) {
      return this.publicApp.serveError({ code: 'service.unavailable', status: 503, message: 'Aucun collecteur disponible pour le moment.' });
    }

    let preferredDate: Date | undefined;
    if (body.preferredDate) {
      const parts = body.preferredDate.split('/');
      if (parts.length === 3) {
        preferredDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }

    await this.prisma.pickupRequest.create({
      data: {
        wasteType: body.wasteType,
        addressText: body.addressText,
        notes: body.notes || null,
        preferredDate: preferredDate || null,
        userId: dbUser.id,
        collectorId: collector.id,
      },
    });

    const view = YeriaUI.createMessageView('request-confirmed', 'Demande enregistrée')
      .setSeverity('success')
      .setIntro('Votre demande de collecte ponctuelle a bien été transmise.')
      .setBody('Nous vous contacterons pour confirmer la date et l\'heure de passage.');
    return this.publicApp.serve(view);
  }

  // GAP-19: Historique des collectes usager (GET /yeria/my-collections)
  async getMyCollections(user: UserEntity) {
    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    if (!dbUser) {
      return this.publicApp.serveError({ code: 'auth.required', status: 401, message: 'Utilisateur introuvable.' });
    }

    const events = await this.prisma.collectionEvent.findMany({
      where: { subscription: { userId: dbUser.id } },
      include: {
        subscription: { include: { offer: true } },
        tour: true,
        rating: true,
      },
      orderBy: { executedAt: 'desc' },
      take: 30,
    });

    const statusLabel: Record<string, string> = {
      PENDING: '⏳ En attente',
      VALIDATED: '✓ Validé',
      DISPUTED: '⚠ Contesté',
      CANCELLED: '✗ Annulé',
    };

    const view = YeriaUI.createActionListView('my-collections', 'Mes collectes')
      .setIntro(
        events.length > 0
          ? `${events.length} collecte(s) trouvée(s).`
          : "Vous n'avez pas encore de collectes enregistrées.",
      );

    for (const ev of events) {
      const date = ev.executedAt
        ? new Date(ev.executedAt).toLocaleDateString('fr-FR')
        : 'Date inconnue';
      const offer = ev.subscription?.offer?.name || 'Collecte';
      const canValidate = ev.status === 'PENDING';
      const canRate = ev.status === 'VALIDATED' && !ev.rating;
      const action = canValidate
        ? `/collections/${ev.trackingId}/validate`
        : canRate
          ? `/collections/${ev.trackingId}/rate`
          : `/collections/${ev.trackingId}`;
      view.addAction(action, `${offer} — ${date}`, `${statusLabel[ev.status] || ev.status}`);
    }

    return this.publicApp.serve(view);
  }

  // GAP-19: Détail + validation d'une collecte
  async getCollectionDetail(id: string, user: UserEntity) {
    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    const event = await this.prisma.collectionEvent.findFirst({
      where: { trackingId: id, subscription: { userId: dbUser?.id } },
      include: { subscription: { include: { offer: true } }, rating: true },
    });

    if (!event) {
      return this.publicApp.serveError({ code: 'not_found', status: 404, message: 'Collecte introuvable.' });
    }

    const view = YeriaUI.createReaderView(`collection-${id}`, 'Détail de collecte')
      .addMarkdown(
        `**Formule:** ${event.subscription?.offer?.name || 'N/A'}\n\n**Statut:** ${event.status}\n\n**Date:** ${event.executedAt ? new Date(event.executedAt).toLocaleString('fr-FR') : 'N/A'}`,
      );

    return this.publicApp.serve(view);
  }

  async validateCollection(id: string, user: UserEntity) {
    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    const event = await this.prisma.collectionEvent.findFirst({
      where: { trackingId: id, subscription: { userId: dbUser?.id }, status: 'PENDING' },
    });

    if (!event) {
      return this.publicApp.serveError({ code: 'not_found', status: 404, message: 'Collecte introuvable ou déjà validée.' });
    }

    await this.prisma.collectionEvent.update({
      where: { id: event.id },
      data: { status: 'VALIDATED' },
    });

    const view = YeriaUI.createMessageView('collection-validated', 'Collecte confirmée')
      .setSeverity('success')
      .setBody('La collecte a été confirmée. Merci de nous faire confiance !')
      .setNext(`/collections/${id}/rate`);
    return this.publicApp.serve(view);
  }

  async getRatingForm(id: string, user: UserEntity) {
    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    const event = await this.prisma.collectionEvent.findFirst({
      where: { trackingId: id, subscription: { userId: dbUser?.id }, status: 'VALIDATED' },
      include: { rating: true },
    });

    if (!event) {
      return this.publicApp.serveError({ code: 'not_found', status: 404, message: 'Collecte introuvable ou non validée.' });
    }
    if (event.rating) {
      return this.publicApp.serveError({ code: 'already_rated', status: 409, message: 'Cette collecte a déjà été évaluée.' });
    }

    const form = YeriaUI.createFormView(`rate-${id}`, 'Évaluer la collecte')
      .setIntro('Votre avis nous aide à améliorer le service.');
    form.addSelectField('score', 'Note', true, [
      { label: '⭐⭐⭐⭐⭐ Excellent', value: '5' },
      { label: '⭐⭐⭐⭐ Bien', value: '4' },
      { label: '⭐⭐⭐ Moyen', value: '3' },
      { label: '⭐⭐ Mauvais', value: '2' },
      { label: '⭐ Très mauvais', value: '1' },
    ]);
    form.addTextField('comment', 'Commentaire (optionnel)', false);
    form.submitButton('Envoyer mon évaluation', 'POST');
    return this.publicApp.serve(form);
  }

  async submitRating(id: string, body: { score?: string; comment?: string }, user: UserEntity) {
    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    const event = await this.prisma.collectionEvent.findFirst({
      where: { trackingId: id, subscription: { userId: dbUser?.id }, status: 'VALIDATED' },
      include: { subscription: { include: { offer: true } }, rating: true },
    });

    if (!event) return this.publicApp.serveError({ code: 'not_found', status: 404, message: 'Collecte introuvable.' });
    if (event.rating) return this.publicApp.serveError({ code: 'already_rated', status: 409, message: 'Déjà évaluée.' });

    const score = parseInt(body.score || '5', 10);
    if (score < 1 || score > 5) {
      return this.publicApp.serveError({ code: 'validation.failed', status: 400, message: 'Note invalide (1-5).' });
    }

    const collectorId = event.subscription?.offer?.collectorId;
    if (!collectorId || !dbUser) return this.publicApp.serveError({ code: 'not_found', status: 404, message: 'Données manquantes.' });

    await this.prisma.rating.create({
      data: {
        score,
        comment: body.comment || null,
        collectorId,
        userId: dbUser.id,
        collectionEventId: event.id,
      },
    });

    const view = YeriaUI.createMessageView('rating-sent', 'Évaluation envoyée')
      .setSeverity('success')
      .setBody('Merci pour votre évaluation !');
    return this.publicApp.serve(view);
  }

  // GAP-21: Signalement de non-collecte / litige
  async getDisputeForm(user?: UserEntity) {
    const form = YeriaUI.createFormView('dispute-form', 'Signaler un problème de collecte')
      .setIntro('Signalez une collecte manquée ou un problème lors du ramassage.');
    form.addSelectField('disputeType', 'Type de problème', true, [
      { label: 'Collecte non effectuée', value: 'MISSED' },
      { label: 'Collecte incomplète', value: 'INCOMPLETE' },
      { label: 'Dommage au bac', value: 'DAMAGE' },
      { label: 'Comportement incorrect', value: 'MISCONDUCT' },
    ]);
    form.addTextField('description', 'Description du problème', true);
    form.submitButton('Soumettre le signalement', 'POST');
    return this.publicApp.serve(form);
  }

  async submitDispute(body: { disputeType?: string; description?: string }, user: UserEntity) {
    if (!body.description) {
      return this.publicApp.serveError({ code: 'validation.failed', status: 400, message: 'La description est obligatoire.' });
    }

    const dbUser = await this.prisma.user.findUnique({ where: { trackingId: user.trackingId } });
    if (!dbUser) return this.publicApp.serveError({ code: 'auth.required', status: 401, message: 'Utilisateur introuvable.' });

    const recentEvent = await this.prisma.collectionEvent.findFirst({
      where: { subscription: { userId: dbUser.id }, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (recentEvent) {
      await this.prisma.collectionEvent.update({
        where: { id: recentEvent.id },
        data: {
          status: 'DISPUTED',
          disputeReason: `[${body.disputeType || 'GENERAL'}] ${body.description}`,
        },
      });
    }

    const view = YeriaUI.createMessageView('dispute-sent', 'Signalement enregistré')
      .setSeverity('success')
      .setBody('Votre signalement a été transmis à notre équipe. Nous vous contacterons dans les 24h.');
    return this.publicApp.serve(view);
  }

  // GAP-23: Agent — enregistrer un arrêt absent/inaccessible
  async getConfirmCollectionForm(tourTrackingId: string, qrData: string) {
    const form = YeriaUI.createFormView(
      `confirm-collection-${tourTrackingId}`,
      'Confirmer le statut de collecte',
    ).setIntro('Indiquez le résultat de cette collecte.');
    form.addSelectField('collectionStatus', 'Statut', true, [
      { label: 'Collecté avec succès', value: 'VALIDATED' },
      { label: 'Bac non accessible / absent', value: 'CANCELLED' },
    ]);
    form.addTextField('notes', 'Remarques (optionnel)', false);
    form.injectData({ qrData });
    form.submitButton('Valider', 'POST');
    return this.agentApp.serve(form);
  }

  async confirmAgentCollection(
    tourTrackingId: string,
    body: { collectionStatus?: string; notes?: string; qrData?: string; gpsLat?: number; gpsLng?: number; photoUrl?: string },
    user?: UserEntity,
    collector?: any,
  ) {
    const cleanQr = (body.qrData || '').trim();
    const status = body.collectionStatus === 'VALIDATED' ? 'VALIDATED' : 'CANCELLED';

    const subscription = await this.prisma.subscription.findFirst({
      where: { OR: [{ qrCodeId: cleanQr }, { trackingId: cleanQr }] },
      include: { offer: true, user: true },
    });

    if (!subscription) {
      return this.agentApp.serveError({ code: 'not_found', status: 404, message: 'QR code inconnu.' });
    }

    const tour = await this.prisma.tour.findFirst({
      where: { trackingId: tourTrackingId },
    });

    if (!tour) {
      return this.agentApp.serveError({ code: 'not_found', status: 404, message: 'Tournée introuvable.' });
    }

    const parsedLat = Number(body.gpsLat);
    const parsedLng = Number(body.gpsLng);
    const hasGps = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
    const lat = hasGps ? parsedLat : 5.35995;
    const lng = hasGps ? parsedLng : -4.00826;
    const executedAt = new Date();
    const autoDeadline = new Date(executedAt.getTime() + 48 * 3600 * 1000);

    await this.prisma.$queryRaw`
      INSERT INTO "CollectionEvent" (
        "trackingId", "createdAt", "updatedAt", "status", "executedAt",
        "photoUrl", "qrScanData", "autoValidationDeadline", "disputeReason", "tourId", "subscriptionId", "gpsProof"
      ) VALUES (
        gen_random_uuid(), NOW(), NOW(),
        ${status}::"CollectionStatus",
        ${executedAt}, ${body.photoUrl || null}, ${cleanQr}, ${autoDeadline},
        ${body.notes || null}, ${tour.id}, ${subscription.id},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    const view = createAgentScanResultPage(
      status === 'VALIDATED',
      status === 'VALIDATED'
        ? 'Collecte enregistrée avec succès.'
        : 'Arrêt enregistré comme non effectué.',
      { qrCodeId: subscription.qrCodeId, clientNom: `${subscription.user?.firstName} ${subscription.user?.lastName}`, formule: subscription.offer?.name, adresse: subscription.addressText, statut: status },
    );
    return this.agentApp.serve(view);
  }

  // GAP-24: Agent — signalement d'incident
  getAgentIncidentForm() {
    const form = YeriaUI.createFormView('agent-incident', 'Signaler un incident')
      .setIntro('Signalez un incident survenu lors de votre tournée.');
    form.addSelectField('incidentType', "Type d'incident", true, [
      { label: 'Accident de véhicule', value: 'VEHICLE_ACCIDENT' },
      { label: 'Bac endommagé', value: 'BIN_DAMAGED' },
      { label: 'Voie inaccessible', value: 'ROAD_BLOCKED' },
      { label: 'Agression / Insécurité', value: 'SECURITY' },
      { label: 'Problème technique', value: 'TECHNICAL' },
      { label: 'Autre', value: 'OTHER' },
    ]);
    form.addTextField('description', 'Description', true);
    form.addTextField('location', 'Lieu (adresse ou coordonnées)', false);
    form.submitButton('Soumettre le signalement', 'POST');
    return this.agentApp.serve(form);
  }

  async submitAgentIncident(
    body: { incidentType?: string; description?: string; location?: string },
    user?: UserEntity,
    collector?: any,
  ) {
    if (!body.description) {
      return this.agentApp.serveError({ code: 'validation.failed', status: 400, message: 'La description est obligatoire.' });
    }

    const view = YeriaUI.createMessageView('incident-sent', 'Incident signalé')
      .setSeverity('info')
      .setBody(
        `Incident [${body.incidentType || 'AUTRE'}] signalé.\n${body.description}\nLieu : ${body.location || 'Non précisé'}`,
      );
    return this.agentApp.serve(view);
  }

  // GAP-25: Génération d'une tournée initiale à l'activation d'un abonnement
  private async scheduleInitialCollections(subscriptionId: bigint, offer: any) {
    const collectorId = offer.collectorId;
    let vehicle = await this.prisma.vehicle.findFirst({ where: { collectorId } });
    if (!vehicle) return;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);

    await this.prisma.tour.create({
      data: {
        reference: `TOUR-INIT-${subscriptionId.toString()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
        scheduledDate: nextDate,
        status: TourStatus.PLANNED,
        vehicleId: vehicle.id,
      },
    });
  }

  private assertAgentCollectorScope(
    resourceCollectorId: bigint,
    collector: { id?: bigint } | null | undefined,
  ): void {
    if (!collector?.id || collector.id !== resourceCollectorId) {
      throw new ForbiddenException(
        "Cette ressource ne fait pas partie du collecteur de l'agent.",
      );
    }
  }
}
