import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ description: 'Nom de l\'offre' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Prix unitaire' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Fréquence (ex: HEBDOMADAIRE, MENSUEL)' })
  @IsString()
  @IsNotEmpty()
  frequency: string;

  @ApiProperty({ description: 'Type de déchet' })
  @IsString()
  @IsNotEmpty()
  wasteType: string;

  @ApiProperty({ description: 'Tracking ID du collecteur propriétaire' })
  @IsString()
  @IsNotEmpty()
  collectorTrackingId: string;

  @ApiProperty({ description: 'Tracking ID de la zone cible' })
  @IsString()
  @IsNotEmpty()
  zoneTrackingId: string;

  @ApiPropertyOptional({ description: 'Statut de l\'offre' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
