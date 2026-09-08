import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/prisma/prisma.service';
import { GenerateCollectorSubscriptionInvoiceDto } from './financial-documents/dto/requests/generate-collector-subscription-invoice.dto';
import { FinancialDocumentResponse } from './financial-documents/dto/responses/financial-document.response';
import { FinancialDocumentType, FinancialDocumentStatus } from '@prisma/client';

@Injectable()
export class CollectorBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateSubscriptionInvoice(
    dto: GenerateCollectorSubscriptionInvoiceDto,
  ): Promise<FinancialDocumentResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: dto.collectorTrackingId },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const dueDays = this.getNumberConfig('COLLECTOR_INVOICE_DUE_DAYS', 15);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const document = await this.prisma.financialDocument.create({
      data: {
        type: FinancialDocumentType.COLLECTOR_SUBSCRIPTION,
        status: FinancialDocumentStatus.PENDING,
        collectorId: collector.id,
        periodStart,
        periodEnd,
        amount: dto.amount,
        dueDate,
        metadata: {
          planTier: dto.planTier,
          planName: dto.planName,
        },
      },
    });

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
      updatedAt: document.updatedAt,
    });
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
