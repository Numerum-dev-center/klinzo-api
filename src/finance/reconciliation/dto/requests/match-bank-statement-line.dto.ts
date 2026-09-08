import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MatchBankStatementLineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transactionTrackingId: string;
}
