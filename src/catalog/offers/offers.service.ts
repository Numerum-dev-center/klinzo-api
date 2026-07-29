import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OfferEntity } from './entities/offer.entity';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/page-meta.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOfferDto: CreateOfferDto): Promise<OfferEntity> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createOfferDto.collectorTrackingId }
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: createOfferDto.zoneTrackingId }
    });
    if (!zone) throw new NotFoundException('Zone not found');

    const { collectorTrackingId, zoneTrackingId, ...data } = createOfferDto;

    const offer = await this.prisma.offer.create({
      data: {
        ...data,
        collectorId: collector.id,
        zoneId: zone.id
      }
    });

    return new OfferEntity(offer as any);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferEntity>> {
    const itemCount = await this.prisma.offer.count();
    const offers = await this.prisma.offer.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map(o => new OfferEntity(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByZone(zoneTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferEntity>> {
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: zoneTrackingId }
    });
    if (!zone) throw new NotFoundException('Zone not found');

    const where = { zoneId: zone.id };
    const itemCount = await this.prisma.offer.count({ where });
    const offers = await this.prisma.offer.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map(o => new OfferEntity(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(collectorTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferEntity>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId }
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.offer.count({ where });
    const offers = await this.prisma.offer.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map(o => new OfferEntity(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<OfferEntity> {
    const offer = await this.prisma.offer.findUnique({ where: { trackingId } });
    if (!offer) throw new NotFoundException('Offer not found');
    return new OfferEntity(offer as any);
  }

  async update(trackingId: string, updateOfferDto: UpdateOfferDto): Promise<OfferEntity> {
    await this.findOne(trackingId); // check exists
    
    // Ignore updates to foreign keys in this basic version
    const { collectorTrackingId, zoneTrackingId, ...data } = updateOfferDto;

    const updated = await this.prisma.offer.update({
      where: { trackingId },
      data
    });
    return new OfferEntity(updated as any);
  }

  async remove(trackingId: string): Promise<void> {
    await this.findOne(trackingId);
    // Soft delete
    await this.prisma.offer.update({
      where: { trackingId },
      data: { isActive: false }
    });
  }
}
