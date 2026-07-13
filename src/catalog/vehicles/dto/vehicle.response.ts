import { ApiProperty } from '@nestjs/swagger';

export class VehicleResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  matricule: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<VehicleResponse>) {
    Object.assign(this, partial);
  }
}
