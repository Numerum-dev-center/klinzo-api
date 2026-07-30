import { CollectionStatus } from '@prisma/client';

export class CollectionEventEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  status: CollectionStatus;
  executedAt: Date | null;
  photoUrl: string | null;
  qrScanData: string | null;
  autoValidationDeadline: Date | null;
  disputeReason: string | null;
  tourId: bigint;
  subscriptionId: bigint;

  constructor(partial: Partial<CollectionEventEntity>) {
    Object.assign(this, partial);
  }
}
