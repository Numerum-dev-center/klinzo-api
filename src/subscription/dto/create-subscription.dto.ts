import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSubscriptionRequest {
  @ApiProperty({ description: 'Tracking ID de l\'usager' })
  @IsString()
  @IsNotEmpty()
  userTrackingId: string;

  @ApiProperty({ description: 'Tracking ID de l\'offre' })
  @IsString()
  @IsNotEmpty()
  offerTrackingId: string;

  @ApiProperty({ description: 'Adresse textuelle' })
  @IsString()
  @IsNotEmpty()
  addressText: string;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  latitude?: number;
}
