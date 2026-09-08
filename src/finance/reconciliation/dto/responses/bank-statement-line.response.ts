import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankStatementLineStatus } from '@prisma/client';

export class BankStatementLineResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  statementDate: Date;

  @ApiProperty()
  label: string;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional()
  source?: string | null;

  @ApiProperty({ enum: BankStatementLineStatus })
  status: BankStatementLineStatus;

  @ApiPropertyOptional()
  matchedAt?: Date | null;

  @ApiPropertyOptional()
  transaction?: {
    trackingId: string;
    amount: number;
    status: string;
    paymentGatewayRef?: string | null;
  } | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(line: BankStatementLineResponse) {
    Object.assign(this, line);
  }
}
