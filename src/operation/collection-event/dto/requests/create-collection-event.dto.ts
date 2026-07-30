import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCollectionEventDto {
  @ApiProperty({ description: 'Tracking ID of the Tour' })
  @IsString()
  @IsNotEmpty()
  tourTrackingId: string;

  @ApiProperty({ description: 'Tracking ID of the Subscription' })
  @IsString()
  @IsNotEmpty()
  subscriptionTrackingId: string;

  @ApiPropertyOptional({ description: 'Photo URL of the collection' })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'QR Code data scanned' })
  @IsString()
  @IsOptional()
  qrScanData?: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  gpsLat: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  gpsLng: number;
}
