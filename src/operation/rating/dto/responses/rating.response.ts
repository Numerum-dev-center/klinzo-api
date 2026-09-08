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
    this.trackingId = partial.trackingId!;
    this.score = partial.score!;
    this.comment = partial.comment;
    this.collectionEventTrackingId = partial.collectionEventTrackingId!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}
