import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateCollectorDto } from './dto/requests/create-collector.dto';
import { UpdateCollectorDto } from './dto/requests/update-collector.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CollectorResponse } from './dto/responses/collector.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { KycStatus } from './entities/enums/kyc-status.enum';
import { SearchCollectorDto } from './dto/requests/search-collector.dto';
import { KycStatusFilterDto } from './dto/requests/kyc-status-filter.dto';
import { TypeFilterDto } from './dto/requests/type-filter.dto';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';
import { KycDocumentType, Role } from '@prisma/client';

@Injectable()
export class CollectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCollectorDto: CreateCollectorDto,
  ): Promise<CollectorResponse> {
    const existingEmail = await this.prisma.collector.findFirst({
      where: { contactEmail: createCollectorDto.contactEmail },
    });
    if (existingEmail)
      throw new ConflictException('Email already used by another collector');

    const collector = await this.prisma.collector.create({
      data: createCollectorDto,
    });
    return new CollectorResponse(collector as any);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CollectorResponse>> {
    const itemCount = await this.prisma.collector.count();
    const collectors = await this.prisma.collector.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser?: RequestingUser,
  ): Promise<CollectorResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    if (
      requestingUser?.role === Role.USAGER &&
      (!collector.isActive || collector.kycStatus !== 'APPROVED')
    ) {
      throw new NotFoundException('Collector not found');
    }
    if (requestingUser) {
      await this.assertCanAccessCollector(collector.id, requestingUser);
    }
    return new CollectorResponse(collector as any);
  }

  async update(
    trackingId: string,
    updateCollectorDto: UpdateCollectorDto,
    requestingUser: RequestingUser,
  ): Promise<CollectorResponse> {
    if (
      isCollectorRole(requestingUser.role) &&
      (updateCollectorDto.kycStatus !== undefined ||
        updateCollectorDto.isActive !== undefined)
    ) {
      throw new ForbiddenException(
        'Un collecteur ne peut pas modifier son statut KYC ou son activation.',
      );
    }
    await this.findOne(trackingId, requestingUser);
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
        kycStatus: KycStatus.SUSPENDED,
      },
    });
  }

  async suspend(trackingId: string): Promise<CollectorResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    if (!collector.isActive) {
      throw new BadRequestException('Collector is already inactive');
    }
    const updated = await this.prisma.collector.update({
      where: { trackingId },
      data: { isActive: false, kycStatus: KycStatus.SUSPENDED },
    });
    return new CollectorResponse(updated as any);
  }

  async reactivate(trackingId: string): Promise<CollectorResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    if (collector.isActive) {
      throw new BadRequestException('Collector is already active');
    }
    const updated = await this.prisma.collector.update({
      where: { trackingId },
      data: { isActive: true },
    });
    return new CollectorResponse(updated as any);
  }

  async getActiveCollectors(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CollectorResponse>> {
    const where = { isActive: true, kycStatus: KycStatus.APPROVED };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async getInactiveCollectors(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CollectorResponse>> {
    const where = { isActive: false };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async search(
    searchDto: SearchCollectorDto,
  ): Promise<PageDto<CollectorResponse>> {
    const where = {
      OR: [
        {
          companyName: {
            contains: searchDto.keyword,
            mode: 'insensitive',
          } as any,
        },
        {
          registrationNumber: {
            contains: searchDto.keyword,
            mode: 'insensitive',
          } as any,
        },
        {
          contactEmail: {
            contains: searchDto.keyword,
            mode: 'insensitive',
          } as any,
        },
        {
          adresse: { contains: searchDto.keyword, mode: 'insensitive' } as any,
        },
      ],
    };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: searchDto.skip,
      take: searchDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: searchDto,
    });
    const entities = collectors.map((c) => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findByType(
    typeDto: TypeFilterDto,
  ): Promise<PageDto<CollectorResponse>> {
    const where = { type: typeDto.type };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: typeDto.skip,
      take: typeDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: typeDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findByKycStatus(
    kycDto: KycStatusFilterDto,
  ): Promise<PageDto<CollectorResponse>> {
    const where = { kycStatus: kycDto.status };
    const itemCount = await this.prisma.collector.count({ where });
    const collectors = await this.prisma.collector.findMany({
      where,
      skip: kycDto.skip,
      take: kycDto.size,
      orderBy: { createdAt: 'desc' },
    });
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: kycDto });
    const entities = collectors.map((c) => new CollectorResponse(c as any));
    return new PageDto(entities, pageMetaDto);
  }

  async getKycDossier(trackingId: string, requestingUser: RequestingUser) {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
      include: {
        kycDocuments: {
          select: {
            trackingId: true,
            createdAt: true,
            type: true,
            fileName: true,
            mimeType: true,
            size: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        kycDecisions: {
          select: {
            trackingId: true,
            createdAt: true,
            status: true,
            reason: true,
            decidedBy: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);
    const { id: _id, ...dossier } = collector;
    return dossier;
  }

  async addKycDocument(
    trackingId: string,
    type: KycDocumentType,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    requestingUser: RequestingUser,
  ) {
    if (!file) throw new BadRequestException('Document requis.');
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format non autorisé. Utilisez PDF, JPEG ou PNG.',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Le document ne doit pas dépasser 5 Mo.');
    }
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const document = await this.prisma.kycDocument.create({
      data: {
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        content: Uint8Array.from(file.buffer),
        uploadedBy: requestingUser.trackingId,
        collectorId: collector.id,
      },
      select: {
        trackingId: true,
        createdAt: true,
        type: true,
        fileName: true,
        mimeType: true,
        size: true,
      },
    });
    await this.prisma.collector.update({
      where: { id: collector.id },
      data: { kycStatus: KycStatus.PENDING_REVIEW, isActive: false },
    });
    return document;
  }

  async getKycDocument(
    collectorTrackingId: string,
    documentTrackingId: string,
    requestingUser: RequestingUser,
  ) {
    const document = await this.prisma.kycDocument.findFirst({
      where: {
        trackingId: documentTrackingId,
        collector: { trackingId: collectorTrackingId },
      },
      include: { collector: { select: { id: true } } },
    });
    if (!document) throw new NotFoundException('Document KYC introuvable.');
    await this.assertCanAccessCollector(document.collector.id, requestingUser);
    return document;
  }

  async decideKyc(
    trackingId: string,
    status: KycStatus.APPROVED | KycStatus.REJECTED,
    reason: string,
    decidedBy: string,
  ) {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId },
      include: { kycDocuments: { select: { type: true } } },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    const documentTypes = new Set(
      collector.kycDocuments.map((document) => document.type),
    );
    const required = [
      KycDocumentType.IDENTITY,
      KycDocumentType.REGISTRATION,
      KycDocumentType.VEHICLE,
    ];
    if (
      status === KycStatus.APPROVED &&
      required.some((type) => !documentTypes.has(type))
    ) {
      throw new BadRequestException(
        'Les pièces identité, enregistrement et véhicule sont requises avant approbation.',
      );
    }
    const normalizedReason = reason.trim();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.kycDecision.create({
        data: {
          status,
          reason: normalizedReason,
          decidedBy,
          collectorId: collector.id,
        },
      });
      await transaction.collector.update({
        where: { id: collector.id },
        data: { kycStatus: status, isActive: status === KycStatus.APPROVED },
      });
    });
    return this.getKycDossier(trackingId, {
      trackingId: decidedBy,
      role: Role.GESTIONNAIRE_SAAS,
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
