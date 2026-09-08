import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRatingDto } from './dto/requests/create-rating.dto';
import { RatingResponse } from './dto/responses/rating.response';
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
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateRatingDto,
    requestingUserTrackingId: string,
  ): Promise<RatingResponse> {
    // a. Load CollectionEvent
    const collectionEvent = await this.prisma.collectionEvent.findUnique({
      where: { trackingId: dto.collectionEventTrackingId },
      include: {
        subscription: {
          include: {
            user: true,
            offer: {
              include: { collector: true },
            },
          },
        },
        rating: true,
      },
    });

    if (!collectionEvent) {
      throw new NotFoundException('CollectionEvent not found');
    }

    // b. Authorization
    if (
      collectionEvent.subscription.user.trackingId !== requestingUserTrackingId
    ) {
      throw new ForbiddenException('You can only rate your own collections');
    }

    // c. Validation status
    if (collectionEvent.status !== CollectionStatus.VALIDATED) {
      throw new BadRequestException(
        'Rating is only allowed after the collection has been validated',
      );
    }

    // d. Uniqueness
    if (collectionEvent.rating) {
      throw new ConflictException('This collection has already been rated');
    }

    // e. Get real userId (BigInt)
    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUserTrackingId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const collectorId = collectionEvent.subscription.offer.collector.id;

    // f. Create Rating
    const rating = await this.prisma.rating.create({
      data: {
        score: dto.score,
        comment: dto.comment,
        collectorId: collectorId,
        userId: user.id,
        collectionEventId: collectionEvent.id,
      },
    });

    // g. Recalculate average
    await this.recalculateCollectorRating(collectorId);

    // h. Return response
    return new RatingResponse({
      trackingId: rating.trackingId,
      score: rating.score,
      comment: rating.comment || undefined,
      collectionEventTrackingId: collectionEvent.trackingId,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    });
  }

  private async recalculateCollectorRating(collectorId: bigint) {
    const aggregations = await this.prisma.rating.aggregate({
      where: { collectorId },
      _avg: { score: true },
    });

    const average = aggregations._avg.score || 0;

    await this.prisma.collector.update({
      where: { id: collectorId },
      data: { ratingAverage: average },
    });
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<RatingResponse>> {
    const itemCount = await this.prisma.rating.count();
    const ratings = await this.prisma.rating.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
      include: { collectionEvent: true },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = ratings.map(
      (r) =>
        new RatingResponse({
          trackingId: r.trackingId,
          score: r.score,
          comment: r.comment || undefined,
          collectionEventTrackingId: r.collectionEvent.trackingId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
    );
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(
    collectorTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<RatingResponse>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.rating.count({ where });
    const ratings = await this.prisma.rating.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
      include: { collectionEvent: true },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = ratings.map(
      (r) =>
        new RatingResponse({
          trackingId: r.trackingId,
          score: r.score,
          comment: r.comment || undefined,
          collectionEventTrackingId: r.collectionEvent.trackingId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
    );
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<RatingResponse> {
    const rating = await this.prisma.rating.findUnique({
      where: { trackingId },
      include: {
        user: true,
        collectionEvent: true,
      },
    });
    if (!rating) throw new NotFoundException('Rating not found');
    if (requestingUser.role === Role.USAGER) {
      assertUserScope(
        rating.user.trackingId,
        requestingUser.trackingId,
        'You can only access your own ratings',
      );
    }
    await this.assertCanAccessCollector(rating.collectorId, requestingUser);

    return new RatingResponse({
      trackingId: rating.trackingId,
      score: rating.score,
      comment: rating.comment || undefined,
      collectionEventTrackingId: rating.collectionEvent.trackingId,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    });
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
}
