import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateOfferDto } from './dto/requests/create-offer.dto';
import { UpdateOfferDto } from './dto/requests/update-offer.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OfferEntity } from './entities/offer.entity';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';
import { KycStatus } from '@prisma/client';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createOfferDto: CreateOfferDto,
    requestingUser: RequestingUser,
  ): Promise<OfferEntity> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createOfferDto.collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);
    this.assertCollectorCanPublishOffers(collector);

    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: createOfferDto.zoneTrackingId },
    });
    if (!zone) throw new NotFoundException('Zone not found');
    if (!zone.isActive) {
      throw new BadRequestException(
        'Cannot create an offer on an inactive zone',
      );
    }

    const { collectorTrackingId, zoneTrackingId, ...data } = createOfferDto;

    const offer = await this.prisma.offer.create({
      data: {
        ...data,
        collectorId: collector.id,
        zoneId: zone.id,
      },
    });

    return new OfferEntity(offer);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferEntity>> {
    const itemCount = await this.prisma.offer.count();
    const offers = await this.prisma.offer.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map((o) => new OfferEntity(o));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByZone(
    zoneTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<OfferEntity>> {
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: zoneTrackingId },
    });
    if (!zone) throw new NotFoundException('Zone not found');

    const collectorId = await this.getRequesterCollectorId(requestingUser);
    const where = collectorId
      ? { zoneId: zone.id, collectorId }
      : { zoneId: zone.id };
    const itemCount = await this.prisma.offer.count({ where });
    const offers = await this.prisma.offer.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map((o) => new OfferEntity(o));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(
    collectorTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<OfferEntity>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.offer.count({ where });
    const offers = await this.prisma.offer.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map((o) => new OfferEntity(o));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<OfferEntity> {
    const offer = await this.findOfferOrThrow(trackingId);
    await this.assertCanAccessCollector(offer.collectorId, requestingUser);
    return new OfferEntity(offer);
  }

  async update(
    trackingId: string,
    updateOfferDto: UpdateOfferDto,
    requestingUser: RequestingUser,
  ): Promise<OfferEntity> {
    const offer = await this.findOfferOrThrow(trackingId);
    await this.assertCanAccessCollector(offer.collectorId, requestingUser);

    // Ignore updates to foreign keys in this basic version
    const { collectorTrackingId, zoneTrackingId, ...data } = updateOfferDto;

    const updated = await this.prisma.offer.update({
      where: { trackingId },
      data,
    });
    return new OfferEntity(updated);
  }

  async remove(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<void> {
    const offer = await this.findOfferOrThrow(trackingId);
    await this.assertCanAccessCollector(offer.collectorId, requestingUser);
    // Soft delete
    await this.prisma.offer.update({
      where: { trackingId },
      data: { isActive: false },
    });
  }

  async activate(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<OfferEntity> {
    const offerDb = await this.prisma.offer.findUnique({
      where: { trackingId },
      include: { collector: true, zone: true },
    });
    if (!offerDb) throw new NotFoundException('Offer not found');
    await this.assertCanAccessCollector(offerDb.collectorId, requestingUser);
    if (offerDb.isActive) {
      throw new BadRequestException('Offer is already active');
    }
    this.assertCollectorCanPublishOffers(offerDb.collector);
    if (!offerDb.zone.isActive) {
      throw new BadRequestException(
        'Cannot activate an offer on an inactive zone',
      );
    }
    const updated = await this.prisma.offer.update({
      where: { trackingId },
      data: { isActive: true },
    });
    return new OfferEntity(updated);
  }

  async deactivate(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<OfferEntity> {
    const offerDb = await this.findOfferOrThrow(trackingId);
    await this.assertCanAccessCollector(offerDb.collectorId, requestingUser);
    if (!offerDb.isActive) {
      throw new BadRequestException('Offer is already inactive');
    }

    const activeSubscriptionsCount = await this.prisma.subscription.count({
      where: {
        offerId: offerDb.id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptionsCount > 0) {
      throw new ConflictException(
        `Cannot deactivate an offer with ${activeSubscriptionsCount} active subscription(s). Reassign or cancel them first.`,
      );
    }

    const updated = await this.prisma.offer.update({
      where: { trackingId },
      data: { isActive: false },
    });
    return new OfferEntity(updated);
  }

  private async findOfferOrThrow(trackingId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { trackingId } });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  private assertCollectorCanPublishOffers(collector: {
    isActive: boolean;
    kycStatus: KycStatus;
  }): void {
    if (!collector.isActive || collector.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        'Collector must be active with approved KYC to publish offers',
      );
    }
  }

  private async getRequesterCollectorId(
    requestingUser: RequestingUser,
  ): Promise<bigint | undefined> {
    if (!isCollectorRole(requestingUser.role)) return undefined;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    if (!user?.collectorId) {
      throw new BadRequestException(
        'Collector user is not linked to a collector',
      );
    }
    return user.collectorId;
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
