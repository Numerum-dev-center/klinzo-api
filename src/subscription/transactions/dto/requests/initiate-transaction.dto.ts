import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subscriptionTrackingId: string;
}
