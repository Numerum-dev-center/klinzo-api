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
    this.trackingId = partial.trackingId!;
    this.matricule = partial.matricule!;
    this.licensePlate = partial.licensePlate!;
    this.type = partial.type!;
    this.capacity = partial.capacity!;
    this.isActive = partial.isActive!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}
