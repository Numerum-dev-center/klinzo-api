import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePickupRequestDto {
  @ApiProperty({ description: 'Tracking ID du collecteur sollicité' })
  @IsString()
  @IsNotEmpty()
  collectorTrackingId: string;

  @ApiProperty({ description: 'Type de déchet à collecter' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  wasteType: string;

  @ApiProperty({ description: 'Adresse de collecte' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressText: string;

  @ApiPropertyOptional({ description: 'Latitude du point de collecte' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude du point de collecte' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Créneau préféré par le client' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ description: 'Prix estimé annoncé au client' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;

  @ApiPropertyOptional({ description: 'Notes ou consignes de collecte' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
