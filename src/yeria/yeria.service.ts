import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../shared/prisma/prisma.service';
import { UserEntity } from '../user/users/entities/user.entity';
import { KycStatus, Role, TourStatus } from '@prisma/client';
import { getYeriaPublicApp, getYeriaAgentApp } from './yeria.config';
import { createHomePage } from './pages/home.page';
import { createOffersListPage } from './pages/offers-list.page';
import { createOfferDetailPage } from './pages/offer-detail.page';
import { createSubscribeFormPage } from './pages/subscribe-form.page';
import { createSubscriptionQRPage } from './pages/subscription-qr.page';
import {
  createMySubscriptionsLookupForm,
  createMySubscriptionsListPage,
} from './pages/my-subscriptions.page';
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

    const view = await createSubscriptionQRPage(fullSub || createdSub);
    return this.publicApp.serve(view);
  }

  // 5. Affichage d'un QR code de bac / souscription
  async getSubscriptionQR(trackingId: string) {
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
      new Set(zones.map((z) => z.city).filter(Boolean)),
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

    const view = createMySubscriptionsLookupForm();
    return this.publicApp.serve(view);
  }

  // 7b. Consultation de mes abonnements par filtre (POST)
  async findMySubscriptions(
    body: { email?: string; subscriptionId?: string },
    user?: UserEntity,
  ) {
    let subscriptions: any[] = [];

    if (user) {
      return this.getMySubscriptions(user);
    }

    if (body.subscriptionId) {
      const sub = await this.prisma.subscription.findFirst({
        where: {
          OR: [
            { trackingId: body.subscriptionId.trim() },
            { qrCodeId: body.subscriptionId.trim() },
          ],
        },
        include: {
          offer: true,
        },
      });
      if (sub) subscriptions.push(sub);
    } else if (body.email) {
      const targetUser = await this.prisma.user.findUnique({
        where: { email: body.email.trim() },
      });
      if (targetUser) {
        subscriptions = await this.prisma.subscription.findMany({
          where: { userId: targetUser.id },
          include: {
            offer: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
      }
    }

    const view = createMySubscriptionsListPage(subscriptions);
    return this.publicApp.serve(view);
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
    const collectorId = collector?.id;
    const where = collectorId ? { vehicle: { collectorId } } : {};

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

    if (collector?.id && subscription.offer.collectorId !== collector.id) {
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
      const collectorId = collector?.id || subscription.offer.collectorId;
      tour = await this.prisma.tour.findFirst({
        where: {
          vehicle: { collectorId },
          status: TourStatus.IN_PROGRESS,
        },
      });

      if (!tour && process.env.NODE_ENV === 'production') {
        const view = createAgentScanResultPage(
          false,
          'Aucune tournée en cours pour votre collecteur.',
        );
        return this.agentApp.serve(view);
      }

      if (!tour) {
        let vehicle = await this.prisma.vehicle.findFirst({
          where: { collectorId },
        });

        if (!vehicle) {
          vehicle = await this.prisma.vehicle.create({
            data: {
              matricule: `CAM-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
              licensePlate: '01-ABJ-00',
              type: 'BENNE_TASSEUSE',
              capacity: 10,
              collectorId,
            },
          });
        }

        tour = await this.prisma.tour.create({
          data: {
            reference: `TOUR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
            scheduledDate: new Date(),
            status: TourStatus.IN_PROGRESS,
            vehicleId: vehicle.id,
            actualStartTime: new Date(),
          },
        });
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
    const collectorId = collector?.id;
    const where = collectorId ? { tour: { vehicle: { collectorId } } } : {};

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
