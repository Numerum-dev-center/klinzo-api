import { Exclude } from 'class-transformer';
import { KycStatus } from './enums/kyc-status.enum';
import { CollectorType } from './enums/collector-type.enum';

export class CollectorEntity {
  @Exclude()
  id: bigint;

  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  type: CollectorType;
  adresse: string;
  kycStatus: KycStatus;
  ratingAverage: number;
  payoutAccount: string | null;
  isActive: boolean;

  constructor(partial: Partial<CollectorEntity>) {
    Object.assign(this, partial);
  }
}
