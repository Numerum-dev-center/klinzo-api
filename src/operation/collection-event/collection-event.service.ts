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
import { CollectionEventResponse } from './dto/responses/collection-event.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { CollectionStatus, Role } from '@prisma/client';
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
      },
    });

    return new CollectionEventResponse(updated);
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
