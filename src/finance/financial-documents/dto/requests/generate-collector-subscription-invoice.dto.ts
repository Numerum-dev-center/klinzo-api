import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class GenerateCollectorSubscriptionInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  collectorTrackingId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planTier: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}
