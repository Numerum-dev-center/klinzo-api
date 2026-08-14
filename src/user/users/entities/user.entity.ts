import { Exclude } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserEntity {
  @Exclude()
  id: bigint;

  trackingId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  phone: string;

  @Exclude()
  password: string;

  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  collectorId: bigint | null;

  // Résolu depuis la relation collector — permet au frontend de scoper ses appels
  // (ex: GET /offers/collector/:collectorTrackingId) sans exposer l'id interne.
  collectorTrackingId?: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
