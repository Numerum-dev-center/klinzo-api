import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialDocumentType, FinancialDocumentStatus } from '@prisma/client';

export class FinancialDocumentResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty({ enum: FinancialDocumentType })
  type: FinancialDocumentType;

  @ApiProperty({ enum: FinancialDocumentStatus })
  status: FinancialDocumentStatus;

  @ApiPropertyOptional()
  periodStart?: Date;

  @ApiPropertyOptional()
  periodEnd?: Date;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  settledAt?: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<FinancialDocumentResponse>) {
    this.trackingId = partial.trackingId!;
    this.type = partial.type!;
    this.status = partial.status!;
    this.periodStart = partial.periodStart;
    this.periodEnd = partial.periodEnd;
    this.amount = partial.amount!;
    this.documentUrl = partial.documentUrl;
    this.dueDate = partial.dueDate;
    this.settledAt = partial.settledAt;
    this.metadata = partial.metadata;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}
