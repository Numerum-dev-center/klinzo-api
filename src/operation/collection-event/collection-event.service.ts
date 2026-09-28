import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCollectionEventDto } from './dto/requests/create-collection-event.dto';
import { DisputeCollectionEventDto } from './dto/requests/dispute-collection-event.dto';
import { ResolveDisputeDto } from './dto/requests/resolve-dispute.dto';
import { CollectionEventResponse } from './dto/responses/collection-event.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import {
  CollectionStatus,
  DisputeHistoryAction,
  DisputeMeasure,
  DisputeStatus,
  Role,
} from '@prisma/client';
import {
  assertCollectorScope,
  assertUserScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class CollectionEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateCollectionEventDto,
    requestingUser: RequestingUser,
  ): Promise<CollectionEventResponse> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId: dto.tourTrackingId },
      include: { vehicle: true },
    });
    if (!tour) throw new NotFoundException('Tour not found');

    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: dto.subscriptionTrackingId },
      include: { offer: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanCreateEvent(
      tour.vehicle.collectorId,
      subscription.offer.collectorId,
      requestingUser,
    );

    const executedAt = new Date();
    const autoValidationHours = this.getNumberConfig(
      'COLLECTION_AUTO_VALIDATION_HOURS',
      48,
    );
    const autoValidationDeadline = new Date(
      executedAt.getTime() + autoValidationHours * 60 * 60 * 1000,
    );

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "CollectionEvent" (
        "trackingId", "createdAt", "updatedAt", "status", "executedAt", 
        "photoUrl", "qrScanData", "autoValidationDeadline", "tourId", "subscriptionId", "gpsProof"
      ) VALUES (
        gen_random_uuid(),
        NOW(),
        NOW(),
        'PENDING'::"CollectionStatus",
        ${executedAt},
        ${dto.photoUrl || null},
        ${dto.qrScanData || null},
        ${autoValidationDeadline},
        ${tour.id},
        ${subscription.id},
        ST_SetSRID(ST_MakePoint(${dto.gpsLng}, ${dto.gpsLat}), 4326)
      )
      RETURNING "trackingId", "status", "executedAt", "photoUrl", "qrScanData", "autoValidationDeadline", "disputeReason", "createdAt", "updatedAt";
    `;

    return new CollectionEventResponse(result[0]);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CollectionEventResponse>> {
    const itemCount = await this.prisma.collectionEvent.count();
    const events = await this.prisma.collectionEvent.findMany({
      include: {
        disputeCase: {
          include: { history: { orderBy: { createdAt: 'asc' } } },
        },
        subscription: {
          include: {
            user: true,
            offer: {
              include: { collector: true },
            },
          },
        },
      },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map((e) => new CollectionEventResponse(e));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllMine(
    pageOptionsDto: PageOptionsDto,
    requestingUserTrackingId: string,
  ): Promise<PageDto<CollectionEventResponse>> {
    const where = {
      subscription: {
        user: { trackingId: requestingUserTrackingId },
      },
    };
    const itemCount = await this.prisma.collectionEvent.count({ where });
    const events = await this.prisma.collectionEvent.findMany({
      where,
      include: {
        rating: { select: { trackingId: true } },
        subscription: {
          include: {
            user: true,
            offer: {
              include: { collector: true },
            },
          },
        },
      },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      events.map((event) => new CollectionEventResponse(event)),
      pageMetaDto,
    );
  }

  async findAllByTour(
    tourTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<CollectionEventResponse>> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId: tourTrackingId },
      include: { vehicle: true },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    await this.assertCanAccessCollector(
      tour.vehicle.collectorId,
      requestingUser,
    );

    const where = { tourId: tour.id };
    const itemCount = await this.prisma.collectionEvent.count({ where });
    const events = await this.prisma.collectionEvent.findMany({
      where,
      include: {
        disputeCase: {
          include: { history: { orderBy: { createdAt: 'asc' } } },
        },
        subscription: {
          select: { trackingId: true },
        },
      },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map((e) => new CollectionEventResponse(e));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllBySubscription(
    subscriptionTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<CollectionEventResponse>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: subscriptionTrackingId },
      include: { user: true, offer: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanAccessSubscription(subscription, requestingUser);

    const where = { subscriptionId: subscription.id };
    const itemCount = await this.prisma.collectionEvent.count({ where });
    const events = await this.prisma.collectionEvent.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map(
      (e) =>
        new CollectionEventResponse({
          ...e,
          subscriptionTrackingId,
        }),
    );
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: {
        disputeCase: {
          include: { history: { orderBy: { createdAt: 'asc' } } },
        },
        subscription: {
          include: {
            user: true,
            offer: {
              include: { collector: true },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('CollectionEvent not found');
    await this.assertCanAccessSubscription(event.subscription, requestingUser);
    return new CollectionEventResponse(event);
  }

  async validate(
    trackingId: string,
    requestingUserTrackingId: string,
  ): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: {
        disputeCase: {
          include: { history: { orderBy: { createdAt: 'asc' } } },
        },
        subscription: {
          include: { user: true },
        },
      },
    });

    if (!event) throw new NotFoundException('CollectionEvent not found');

    // Authorization check
    if (event.subscription.user.trackingId !== requestingUserTrackingId) {
      throw new ForbiddenException(
        'You do not have permission to validate this event',
      );
    }

    if (event.status !== CollectionStatus.PENDING) {
      throw new BadRequestException('Already validated or disputed');
    }

    const updated = await this.prisma.collectionEvent.update({
      where: { trackingId },
      data: { status: CollectionStatus.VALIDATED },
    });

    return new CollectionEventResponse(updated);
  }

  async dispute(
    trackingId: string,
    requestingUserTrackingId: string,
    dto: DisputeCollectionEventDto,
  ): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: {
        disputeCase: {
          include: { history: { orderBy: { createdAt: 'asc' } } },
        },
        subscription: {
          include: { user: true },
        },
      },
    });

    if (!event) throw new NotFoundException('CollectionEvent not found');

    // Authorization check
    if (event.subscription.user.trackingId !== requestingUserTrackingId) {
      throw new ForbiddenException(
        'You do not have permission to dispute this event',
      );
    }

    if (event.status !== CollectionStatus.PENDING) {
      throw new BadRequestException('Already validated or disputed');
    }

    const updated = await this.prisma.collectionEvent.update({
      where: { trackingId },
      data: {
        status: CollectionStatus.DISPUTED,
        disputeReason: dto.disputeReason,
        disputeCase: {
          create: {
            history: {
              create: {
                action: DisputeHistoryAction.OPENED,
                toStatus: DisputeStatus.OPEN,
                reason: dto.disputeReason,
                actorTrackingId: requestingUserTrackingId,
              },
            },
          },
        },
      },
      include: { disputeCase: { include: { history: true } } },
    });

    return new CollectionEventResponse(updated);
  }

  async startDisputeReview(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: { disputeCase: true },
    });
    if (
      !event ||
      event.status !== CollectionStatus.DISPUTED ||
      !event.disputeCase
    ) {
      throw new NotFoundException('Dispute not found');
    }
    if (event.disputeCase.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Dispute already resolved');
    }
    if (event.disputeCase.status === DisputeStatus.OPEN) {
      await this.prisma.disputeCase.update({
        where: { id: event.disputeCase.id },
        data: {
          status: DisputeStatus.IN_REVIEW,
          assignedTo: requestingUser.trackingId,
          history: {
            create: {
              action: DisputeHistoryAction.REVIEW_STARTED,
              fromStatus: DisputeStatus.OPEN,
              toStatus: DisputeStatus.IN_REVIEW,
              actorTrackingId: requestingUser.trackingId,
            },
          },
        },
      });
    }
    return this.findOne(trackingId, requestingUser);
  }

  async resolveDispute(
    trackingId: string,
    dto: ResolveDisputeDto,
    requestingUser: RequestingUser,
  ): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: { disputeCase: true },
    });
    if (
      !event ||
      event.status !== CollectionStatus.DISPUTED ||
      !event.disputeCase
    ) {
      throw new NotFoundException('Dispute not found');
    }
    if (event.disputeCase.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Dispute already resolved');
    }

    const measure = dto.measure ?? DisputeMeasure.NONE;
    await this.prisma.disputeCase.update({
      where: { id: event.disputeCase.id },
      data: {
        status: DisputeStatus.RESOLVED,
        decision: dto.decision,
        resolutionReason: dto.reason.trim(),
        measure,
        assignedTo: event.disputeCase.assignedTo ?? requestingUser.trackingId,
        resolvedBy: requestingUser.trackingId,
        resolvedAt: new Date(),
        history: {
          create: {
            action: DisputeHistoryAction.RESOLVED,
            fromStatus: event.disputeCase.status,
            toStatus: DisputeStatus.RESOLVED,
            decision: dto.decision,
            reason: dto.reason.trim(),
            measure,
            actorTrackingId: requestingUser.trackingId,
          },
        },
      },
    });
    return this.findOne(trackingId, requestingUser);
  }

  private async assertCanCreateEvent(
    tourCollectorId: bigint,
    subscriptionCollectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (tourCollectorId !== subscriptionCollectorId) {
      throw new BadRequestException(
        'Tour and subscription must belong to the same collector',
      );
    }

    await this.assertCanAccessCollector(tourCollectorId, requestingUser);
  }

  private async assertCanAccessCollector(
    collectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (!isCollectorRole(requestingUser.role)) return;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    assertCollectorScope(user, collectorId);
  }

  private async assertCanAccessSubscription(
    subscription: {
      user: { trackingId: string };
      offer?: { collectorId: bigint };
    },
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (requestingUser.role === Role.USAGER) {
      assertUserScope(
        subscription.user.trackingId,
        requestingUser.trackingId,
        'You can only access collection events for your own subscription',
      );
      return;
    }

    if (isCollectorRole(requestingUser.role)) {
      if (!subscription.offer) {
        throw new NotFoundException('Subscription offer not found');
      }
      await this.assertCanAccessCollector(
        subscription.offer.collectorId,
        requestingUser,
      );
    }
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
