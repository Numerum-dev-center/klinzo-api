import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: 'Tracking ID of the Collection Event' })
  @IsString()
  @IsNotEmpty()
  collectionEventTrackingId: string;

  @ApiProperty({ description: 'Score out of 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  score: number;

  @ApiPropertyOptional({ description: 'Optional comment', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
