import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BankStatementLineStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { CreateBankStatementLineDto } from './dto/requests/create-bank-statement-line.dto';
import { MatchBankStatementLineDto } from './dto/requests/match-bank-statement-line.dto';
import { BankStatementLineResponse } from './dto/responses/bank-statement-line.response';

const includeTransaction = {
  transaction: {
    select: {
      trackingId: true,
      amount: true,
      status: true,
      paymentGatewayRef: true,
    },
  },
};

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async createLine(
    dto: CreateBankStatementLineDto,
  ): Promise<BankStatementLineResponse> {
    const line = await this.prisma.bankStatementLine.create({
      data: {
        statementDate: new Date(dto.statementDate),
        label: dto.label,
        amount: dto.amount,
        reference: dto.reference,
        source: dto.source,
      },
      include: includeTransaction,
    });

    return new BankStatementLineResponse(line);
  }

  async findLines(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<BankStatementLineResponse>> {
    const itemCount = await this.prisma.bankStatementLine.count();
    const lines = await this.prisma.bankStatementLine.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { statementDate: 'desc' },
      include: includeTransaction,
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      lines.map((line) => new BankStatementLineResponse(line)),
      pageMetaDto,
    );
  }

  async autoMatch(): Promise<{ matched: number }> {
    const lines = await this.prisma.bankStatementLine.findMany({
      where: { status: BankStatementLineStatus.UNMATCHED },
    });
    let matched = 0;

    for (const line of lines) {
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          amount: line.amount,
          ...(line.reference ? { paymentGatewayRef: line.reference } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (transaction) {
        await this.prisma.bankStatementLine.update({
          where: { id: line.id },
          data: {
            status: BankStatementLineStatus.MATCHED,
            transactionId: transaction.id,
            matchedAt: new Date(),
          },
        });
        matched += 1;
      }
    }

    return { matched };
  }

  async matchLine(
    trackingId: string,
    dto: MatchBankStatementLineDto,
  ): Promise<BankStatementLineResponse> {
    const [line, transaction] = await Promise.all([
      this.prisma.bankStatementLine.findUnique({ where: { trackingId } }),
      this.prisma.transaction.findUnique({
        where: { trackingId: dto.transactionTrackingId },
      }),
    ]);

    if (!line) throw new NotFoundException('Bank statement line not found');
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (line.status === BankStatementLineStatus.MATCHED) {
      throw new BadRequestException('Bank statement line is already matched');
    }

    const updated = await this.prisma.bankStatementLine.update({
      where: { trackingId },
      data: {
        status: BankStatementLineStatus.MATCHED,
        transactionId: transaction.id,
        matchedAt: new Date(),
      },
      include: includeTransaction,
    });

    return new BankStatementLineResponse(updated);
  }
}
