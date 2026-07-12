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
import { SearchCollectorDto } from './dto/request/search-collector.dto';
import { KycStatusFilterDto } from './dto/request/kyc-status-filter.dto';
import { TypeFilterDto } from './dto/request/type-filter.dto';

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
    await this.prisma.collector.update({ 
      where: { trackingId },
      data: {
        isActive: false,
        kycStatus: KycStatus.SUSPENDED
      }
    });
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

  async search(searchDto: SearchCollectorDto): Promise<PageDto<CollectorResponse>> {
    const where = {
      OR: [
        { companyName: { contains: searchDto.keyword, mode: 'insensitive' } as any },
        { registrationNumber: { contains: searchDto.keyword, mode: 'insensitive' } as any },
        { contactEmail: { contains: searchDto.keyword, mode: 'insensitive' } as any },
        { adresse: { contains: searchDto.keyword, mode: 'insensitive' } as any },
      ]
    };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: searchDto.skip,
      take: searchDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: searchDto });
    const entities = collectors.map(c => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findByType(typeDto: TypeFilterDto): Promise<PageDto<CollectorResponse>> {
    const where = { type: typeDto.type };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: typeDto.skip,
      take: typeDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: typeDto });
    const entities = collectors.map(c => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findByKycStatus(kycDto: KycStatusFilterDto): Promise<PageDto<CollectorResponse>> {
    const where = { kycStatus: kycDto.status };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: kycDto.skip,
      take: kycDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: kycDto });
    const entities = collectors.map(c => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }
}
