import { TourStatus } from '@prisma/client';

export class TourEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  reference: string;
  scheduledDate: Date;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  status: TourStatus;
  vehicleId: bigint;

  constructor(partial: Partial<TourEntity>) {
    Object.assign(this, partial);
  }
}
