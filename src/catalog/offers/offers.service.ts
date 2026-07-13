import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OfferResponse } from './dto/offer.response';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/page-meta.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOfferDto: CreateOfferDto): Promise<OfferResponse> {
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

    return new OfferResponse(offer as any);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferResponse>> {
    const itemCount = await this.prisma.offer.count();
    const offers = await this.prisma.offer.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = offers.map(o => new OfferResponse(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByZone(zoneTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferResponse>> {
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
    const entities = offers.map(o => new OfferResponse(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(collectorTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<OfferResponse>> {
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
    const entities = offers.map(o => new OfferResponse(o as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<OfferResponse> {
    const offer = await this.prisma.offer.findUnique({ where: { trackingId } });
    if (!offer) throw new NotFoundException('Offer not found');
    return new OfferResponse(offer as any);
  }

  async update(trackingId: string, updateOfferDto: UpdateOfferDto): Promise<OfferResponse> {
    await this.findOne(trackingId); // check exists
    
    // Ignore updates to foreign keys in this basic version
    const { collectorTrackingId, zoneTrackingId, ...data } = updateOfferDto;

    const updated = await this.prisma.offer.update({
      where: { trackingId },
      data
    });
    return new OfferResponse(updated as any);
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
