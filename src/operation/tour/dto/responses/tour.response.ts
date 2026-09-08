import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TourStatus } from '@prisma/client';

export class TourResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  scheduledDate: Date;

  @ApiPropertyOptional()
  actualStartTime?: Date | null;

  @ApiPropertyOptional()
  actualEndTime?: Date | null;

  @ApiProperty({ enum: TourStatus })
  status: TourStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  collectionEventsCount?: number;

  constructor(partial: Partial<TourResponse>) {
    this.trackingId = partial.trackingId!;
    this.reference = partial.reference!;
    this.scheduledDate = partial.scheduledDate!;
    this.actualStartTime = partial.actualStartTime;
    this.actualEndTime = partial.actualEndTime;
    this.status = partial.status!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
    this.collectionEventsCount = partial.collectionEventsCount;
  }
}
