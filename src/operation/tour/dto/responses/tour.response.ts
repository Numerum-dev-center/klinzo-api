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
  actualStartTime?: Date;

  @ApiPropertyOptional()
  actualEndTime?: Date;

  @ApiProperty({ enum: TourStatus })
  status: TourStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  collectionEventsCount?: number;

  constructor(partial: Partial<TourResponse>) {
    Object.assign(this, partial);
  }
}
