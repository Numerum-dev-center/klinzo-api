import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeDecision, DisputeMeasure } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: DisputeDecision })
  @IsEnum(DisputeDecision)
  decision: DisputeDecision;

  @ApiProperty({
    description: 'Motif obligatoire de la décision',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ enum: DisputeMeasure, default: DisputeMeasure.NONE })
  @IsEnum(DisputeMeasure)
  @IsOptional()
  measure?: DisputeMeasure;
}
