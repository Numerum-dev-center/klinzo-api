import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCollectionEventDto } from './dto/requests/create-collection-event.dto';
import { DisputeCollectionEventDto } from './dto/requests/dispute-collection-event.dto';
import { CollectionEventResponse } from './dto/responses/collection-event.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { CollectionStatus } from '@prisma/client';

@Injectable()
export class CollectionEventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCollectionEventDto): Promise<CollectionEventResponse> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId: dto.tourTrackingId }
    });
    if (!tour) throw new NotFoundException('Tour not found');

    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: dto.subscriptionTrackingId }
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const executedAt = new Date();
    // TODO: This 48h deadline should become an admin parameter later
    const autoValidationDeadline = new Date(executedAt.getTime() + 48 * 60 * 60 * 1000);

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

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectionEventResponse>> {
    const itemCount = await this.prisma.collectionEvent.count();
    const events = await this.prisma.collectionEvent.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map(e => new CollectionEventResponse(e as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByTour(tourTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectionEventResponse>> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId: tourTrackingId }
    });
    if (!tour) throw new NotFoundException('Tour not found');

    const where = { tourId: tour.id };
    const itemCount = await this.prisma.collectionEvent.count({ where });
    const events = await this.prisma.collectionEvent.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map(e => new CollectionEventResponse(e as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllBySubscription(subscriptionTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectionEventResponse>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: subscriptionTrackingId }
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const where = { subscriptionId: subscription.id };
    const itemCount = await this.prisma.collectionEvent.count({ where });
    const events = await this.prisma.collectionEvent.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = events.map(e => new CollectionEventResponse(e as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({ where: { trackingId } });
    if (!event) throw new NotFoundException('CollectionEvent not found');
    return new CollectionEventResponse(event as any);
  }

  async validate(trackingId: string, requestingUserTrackingId: string): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: {
        subscription: {
          include: { user: true }
        }
      }
    });

    if (!event) throw new NotFoundException('CollectionEvent not found');

    // Authorization check
    if (event.subscription.user.trackingId !== requestingUserTrackingId) {
      throw new ForbiddenException('You do not have permission to validate this event');
    }

    if (event.status !== CollectionStatus.PENDING) {
      throw new BadRequestException('Already validated or disputed');
    }

    const updated = await this.prisma.collectionEvent.update({
      where: { trackingId },
      data: { status: CollectionStatus.VALIDATED }
    });

    return new CollectionEventResponse(updated as any);
  }

  async dispute(trackingId: string, requestingUserTrackingId: string, dto: DisputeCollectionEventDto): Promise<CollectionEventResponse> {
    const event = await this.prisma.collectionEvent.findUnique({
      where: { trackingId },
      include: {
        subscription: {
          include: { user: true }
        }
      }
    });

    if (!event) throw new NotFoundException('CollectionEvent not found');

    // Authorization check
    if (event.subscription.user.trackingId !== requestingUserTrackingId) {
      throw new ForbiddenException('You do not have permission to dispute this event');
    }

    if (event.status !== CollectionStatus.PENDING) {
      throw new BadRequestException('Already validated or disputed');
    }

    const updated = await this.prisma.collectionEvent.update({
      where: { trackingId },
      data: { 
        status: CollectionStatus.DISPUTED,
        disputeReason: dto.disputeReason 
      }
    });

    return new CollectionEventResponse(updated as any);
  }
}
