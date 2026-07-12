import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCollectorDto } from './dto/request/create-collector.dto';
import { UpdateCollectorDto } from './dto/request/update-collector.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CollectorResponse } from './dto/response/collector.response';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { PageMetaDto } from '../../shared/pagination/dto/page-meta.dto';
import { PageDto } from '../../shared/pagination/dto/page.dto';
import { CollectorType } from './entities/enums/collector-type.enum';
import { KycStatus } from './entities/enums/kyc-status.enum';

@Injectable()
export class CollectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCollectorDto: CreateCollectorDto): Promise<CollectorResponse> {
    const existingEmail = await this.prisma.collector.findFirst({
      where: { contactEmail: createCollectorDto.contactEmail },
    });
    if (existingEmail) throw new ConflictException('Email already used by another collector');

    const collector = await this.prisma.collector.create({
      data: createCollectorDto,
    });
    return new CollectorResponse(collector as any);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectorResponse>> {
    const itemCount = await this.prisma.collector.count();
    const collectors = await this.prisma.collector.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' },
    });
    
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<CollectorResponse> {
    const collector = await this.prisma.collector.findUnique({ where: { trackingId } });
    if (!collector) throw new NotFoundException('Collector not found');
    return new CollectorResponse(collector as any);
  }

  async update(trackingId: string, updateCollectorDto: UpdateCollectorDto): Promise<CollectorResponse> {
    await this.findOne(trackingId); // Check exists
    const updated = await this.prisma.collector.update({
      where: { trackingId },
      data: updateCollectorDto,
    });
    return new CollectorResponse(updated as any);
  }

  async remove(trackingId: string): Promise<void> {
    await this.findOne(trackingId);
    await this.prisma.collector.delete({ where: { trackingId } });
  }

  async getActiveCollectors(pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectorResponse>> {
    const where = { isActive: true };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map(c => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async getInactiveCollectors(pageOptionsDto: PageOptionsDto): Promise<PageDto<CollectorResponse>> {
    const where = { isActive: false };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map(c => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  getCollectorTypes(): string[] {
    return Object.values(CollectorType);
  }

  getKycStatuses(): string[] {
    return Object.values(KycStatus);
  }
}
