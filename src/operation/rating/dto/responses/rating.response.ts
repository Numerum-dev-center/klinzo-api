import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RatingResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  score: number;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  collectionEventTrackingId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<RatingResponse>) {
    Object.assign(this, partial);
  }
}
