import { ApiProperty } from '@nestjs/swagger';

export class OfferResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  frequency: string;

  @ApiProperty()
  wasteType: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<OfferResponse>) {
    Object.assign(this, partial);
  }
}
