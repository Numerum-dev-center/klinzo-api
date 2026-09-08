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

  @Exclude()
  hashedRefreshToken?: string | null;

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
    this.trackingId = partial.trackingId!;
    this.firstName = partial.firstName!;
    this.lastName = partial.lastName!;
    this.email = partial.email!;
    this.emailVerified = partial.emailVerified!;
    this.phone = partial.phone!;
    this.role = partial.role!;
    this.isActive = partial.isActive!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
    this.collectorTrackingId = partial.collectorTrackingId;
  }
}
