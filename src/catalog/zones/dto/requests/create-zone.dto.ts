import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'GeoJSON Object representing the Polygon' })
  @IsObject()
  geojson: Record<string, any>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  collectorTrackingId: string;
}
