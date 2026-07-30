export class RatingEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  score: number;
  comment: string | null;
  collectorId: bigint;
  userId: bigint;
  collectionEventId: bigint;

  constructor(partial: Partial<RatingEntity>) {
    Object.assign(this, partial);
  }
}
