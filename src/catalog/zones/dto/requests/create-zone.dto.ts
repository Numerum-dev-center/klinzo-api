import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'GeoJSON Object representing the Polygon' })
  @IsObject()
  geojson: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  collectorTrackingId?: string;
}
