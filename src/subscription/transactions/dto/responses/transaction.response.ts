import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  platformCommission: number;

  @ApiPropertyOptional()
  paymentGatewayRef?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  invoicePdfUrl?: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<TransactionResponse>) {
    Object.assign(this, partial);
  }
}
