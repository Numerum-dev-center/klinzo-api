import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FinancialDocumentResponse } from './dto/responses/financial-document.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { FinancialDocumentType, FinancialDocumentStatus, Role } from '@prisma/client';

@Injectable()
export class FinancialDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pageOptionsDto: PageOptionsDto, type?: FinancialDocumentType): Promise<PageDto<FinancialDocumentResponse>> {
    const where = type ? { type } : {};
    
    const itemCount = await this.prisma.financialDocument.count({ where });
    const documents = await this.prisma.financialDocument.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = documents.map(d => new FinancialDocumentResponse({
      trackingId: d.trackingId,
      type: d.type,
      status: d.status,
      periodStart: d.periodStart || undefined,
      periodEnd: d.periodEnd || undefined,
      amount: d.amount,
      documentUrl: d.documentUrl || undefined,
      dueDate: d.dueDate || undefined,
      settledAt: d.settledAt || undefined,
      metadata: d.metadata,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
    
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(
    collectorTrackingId: string, 
    pageOptionsDto: PageOptionsDto, 
    requestingUser: { trackingId: string, role: Role }
  ): Promise<PageDto<FinancialDocumentResponse>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId }
    });

    if (!collector) throw new NotFoundException('Collector not found');

    if (requestingUser.role === Role.ADMIN_COLLECTEUR || requestingUser.role === Role.AGENT_COLLECTEUR) {
      const user = await this.prisma.user.findUnique({
        where: { trackingId: requestingUser.trackingId }
      });
      if (!user || user.collectorId !== collector.id) {
        throw new ForbiddenException('You can only access financial documents for your own collector entity');
      }
    }

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.financialDocument.count({ where });
    const documents = await this.prisma.financialDocument.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = documents.map(d => new FinancialDocumentResponse({
      trackingId: d.trackingId,
      type: d.type,
      status: d.status,
      periodStart: d.periodStart || undefined,
      periodEnd: d.periodEnd || undefined,
      amount: d.amount,
      documentUrl: d.documentUrl || undefined,
      dueDate: d.dueDate || undefined,
      settledAt: d.settledAt || undefined,
      metadata: d.metadata,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
    
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string, 
    requestingUser: { trackingId: string, role: Role }
  ): Promise<FinancialDocumentResponse> {
    const document = await this.prisma.financialDocument.findUnique({
      where: { trackingId }
    });

    if (!document) throw new NotFoundException('Financial document not found');

    if (requestingUser.role === Role.ADMIN_COLLECTEUR || requestingUser.role === Role.AGENT_COLLECTEUR) {
      const user = await this.prisma.user.findUnique({
        where: { trackingId: requestingUser.trackingId }
      });
      if (!user || user.collectorId !== document.collectorId) {
        throw new ForbiddenException('You can only access financial documents for your own collector entity');
      }
    }

    return new FinancialDocumentResponse({
      trackingId: document.trackingId,
      type: document.type,
      status: document.status,
      periodStart: document.periodStart || undefined,
      periodEnd: document.periodEnd || undefined,
      amount: document.amount,
      documentUrl: document.documentUrl || undefined,
      dueDate: document.dueDate || undefined,
      settledAt: document.settledAt || undefined,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  }

  async markAsPaid(trackingId: string): Promise<FinancialDocumentResponse> {
    const document = await this.prisma.financialDocument.findUnique({
      where: { trackingId }
    });

    if (!document) throw new NotFoundException('Financial document not found');

    if (document.status !== FinancialDocumentStatus.PENDING) {
      throw new BadRequestException('Only PENDING documents can be marked as PAID');
    }

    const updatedDocument = await this.prisma.financialDocument.update({
      where: { id: document.id },
      data: {
        status: FinancialDocumentStatus.PAID,
        settledAt: new Date()
      }
    });

    return new FinancialDocumentResponse({
      trackingId: updatedDocument.trackingId,
      type: updatedDocument.type,
      status: updatedDocument.status,
      periodStart: updatedDocument.periodStart || undefined,
      periodEnd: updatedDocument.periodEnd || undefined,
      amount: updatedDocument.amount,
      documentUrl: updatedDocument.documentUrl || undefined,
      dueDate: updatedDocument.dueDate || undefined,
      settledAt: updatedDocument.settledAt || undefined,
      metadata: updatedDocument.metadata,
      createdAt: updatedDocument.createdAt,
      updatedAt: updatedDocument.updatedAt
    });
  }
}
