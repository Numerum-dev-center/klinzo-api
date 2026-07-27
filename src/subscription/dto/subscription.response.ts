import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  qrCodeId: string;

  @ApiProperty()
  addressText: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  nextBillingDate?: Date;

  @ApiPropertyOptional()
  gpsLocation?: any; // { lat, lng } or raw GeoJSON

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<SubscriptionResponse>) {
    Object.assign(this, partial);
  }
}
