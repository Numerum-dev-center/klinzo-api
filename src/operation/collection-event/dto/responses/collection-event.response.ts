import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionStatus } from '@prisma/client';

export class CollectionEventResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty({ enum: CollectionStatus })
  status: CollectionStatus;

  @ApiPropertyOptional()
  executedAt?: Date;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  qrScanData?: string;

  @ApiPropertyOptional()
  autoValidationDeadline?: Date;

  @ApiPropertyOptional()
  disputeReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<CollectionEventResponse>) {
    Object.assign(this, partial);
  }
}
