import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { GenerateCollectorSubscriptionInvoiceDto } from './financial-documents/dto/requests/generate-collector-subscription-invoice.dto';
import { FinancialDocumentResponse } from './financial-documents/dto/responses/financial-document.response';
import { FinancialDocumentType, FinancialDocumentStatus } from '@prisma/client';

@Injectable()
export class CollectorBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSubscriptionInvoice(dto: GenerateCollectorSubscriptionInvoiceDto): Promise<FinancialDocumentResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: dto.collectorTrackingId }
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    
    // dueDate = periodEnd + 15 days
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    // TODO: ce montant est saisi manuellement pour le MVP faute de table de plans 
    // d'abonnement SaaS collecteur (§6.4 du TDR — à créer en V1 : CollectorSubscriptionPlan).
    
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
          planName: dto.planName
        }
      }
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
      updatedAt: document.updatedAt
    });
  }
}
