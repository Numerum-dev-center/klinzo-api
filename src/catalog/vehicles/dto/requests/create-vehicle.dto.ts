import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Matricule interne du véhicule' })
  @IsString()
  @IsNotEmpty()
  matricule: string;

  @ApiProperty({ description: "Plaque d'immatriculation" })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ description: 'Type de véhicule (ex: CAMION, TRICYCLE)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Capacité en kg ou tonnes' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: 'Tracking ID du collecteur propriétaire' })
  @IsString()
  @IsNotEmpty()
  collectorTrackingId: string;

  @ApiPropertyOptional({ description: 'Statut du véhicule' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
