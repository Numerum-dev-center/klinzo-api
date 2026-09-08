import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class SchedulePickupRequestDto {
  @ApiProperty({ description: 'Date retenue pour la collecte ponctuelle' })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ description: 'Prix final confirmé par le collecteur' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPrice?: number;
}
