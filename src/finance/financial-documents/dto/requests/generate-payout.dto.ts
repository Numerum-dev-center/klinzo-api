import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class GeneratePayoutDto {
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
}
