import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PickupRequestStatus } from '@prisma/client';

type PickupRequestWithRelations = {
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  status: PickupRequestStatus;
  wasteType: string;
  addressText: string;
  latitude?: number | null;
  longitude?: number | null;
  preferredDate?: Date | null;
  scheduledDate?: Date | null;
  completedAt?: Date | null;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  notes?: string | null;
  cancellationReason?: string | null;
  user?: {
    trackingId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  collector?: {
    trackingId: string;
    companyName: string;
    contactPhone: string;
  };
};

export class PickupRequestResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ enum: PickupRequestStatus })
  status: PickupRequestStatus;

  @ApiProperty()
  wasteType: string;

  @ApiProperty()
  addressText: string;

  @ApiPropertyOptional()
  latitude?: number | null;

  @ApiPropertyOptional()
  longitude?: number | null;

  @ApiPropertyOptional()
  preferredDate?: Date | null;

  @ApiPropertyOptional()
  scheduledDate?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  estimatedPrice?: number | null;

  @ApiPropertyOptional()
  finalPrice?: number | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  cancellationReason?: string | null;

  @ApiPropertyOptional()
  user?: {
    trackingId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  @ApiPropertyOptional()
  collector?: {
    trackingId: string;
    companyName: string;
    contactPhone: string;
  };

  constructor(request: PickupRequestWithRelations) {
    this.trackingId = request.trackingId;
    this.createdAt = request.createdAt;
    this.updatedAt = request.updatedAt;
    this.status = request.status;
    this.wasteType = request.wasteType;
    this.addressText = request.addressText;
    this.latitude = request.latitude;
    this.longitude = request.longitude;
    this.preferredDate = request.preferredDate;
    this.scheduledDate = request.scheduledDate;
    this.completedAt = request.completedAt;
    this.estimatedPrice = request.estimatedPrice;
    this.finalPrice = request.finalPrice;
    this.notes = request.notes;
    this.cancellationReason = request.cancellationReason;

    if (request.user) {
      this.user = {
        trackingId: request.user.trackingId,
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        email: request.user.email,
        phone: request.user.phone,
      };
    }

    if (request.collector) {
      this.collector = {
        trackingId: request.collector.trackingId,
        companyName: request.collector.companyName,
        contactPhone: request.collector.contactPhone,
      };
    }
  }
}
