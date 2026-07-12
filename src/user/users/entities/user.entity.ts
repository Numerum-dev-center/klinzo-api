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

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
