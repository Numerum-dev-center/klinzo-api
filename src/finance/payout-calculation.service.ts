import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { GeneratePayoutDto } from './financial-documents/dto/requests/generate-payout.dto';
import { FinancialDocumentResponse } from './financial-documents/dto/responses/financial-document.response';
import { FinancialDocumentType, FinancialDocumentStatus } from '@prisma/client';

@Injectable()
export class PayoutCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePayout(dto: GeneratePayoutDto): Promise<FinancialDocumentResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: dto.collectorTrackingId }
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Fetch unsettled SUCCESS transactions for this collector within the period
    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: 'SUCCESS',
        financialDocumentId: null,
        timestamp: {
          gte: periodStart,
          lte: periodEnd
        },
        subscription: {
          offer: {
            collectorId: collector.id
          }
        }
      }
    });

    if (transactions.length === 0) {
      throw new BadRequestException('No unsettled transactions found for this collector in this period');
    }

    let grossAmount = 0;
    let commissionRetained = 0;
    const transactionIds: string[] = [];

    for (const tx of transactions) {
      grossAmount += Number(tx.amount);
      commissionRetained += Number(tx.platformCommission);
      transactionIds.push(tx.trackingId);
    }

    const netAmount = grossAmount - commissionRetained;

    const document = await this.prisma.financialDocument.create({
      data: {
        type: FinancialDocumentType.PAYOUT,
        status: FinancialDocumentStatus.PENDING,
        collectorId: collector.id,
        periodStart,
        periodEnd,
        amount: netAmount,
        metadata: {
          grossAmount,
          commissionRetained,
          transactionIds
        }
      }
    });

    // Update transactions to link them to this payout
    await this.prisma.transaction.updateMany({
      where: {
        id: { in: transactions.map(t => t.id) }
      },
      data: {
        financialDocumentId: document.id
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
