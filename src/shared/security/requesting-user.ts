import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface RequestingUser {
  trackingId: string;
  role: Role;
}

export function isCollectorRole(role: Role): boolean {
  return role === Role.ADMIN_COLLECTEUR || role === Role.AGENT_COLLECTEUR;
}

export function assertCollectorScope(
  user: { collectorId: bigint | null } | null,
  collectorId: bigint,
  message = 'You can only access resources for your own collector entity',
): void {
  if (!user || user.collectorId !== collectorId) {
    throw new ForbiddenException(message);
  }
}

export function assertUserScope(
  ownerTrackingId: string,
  requestingUserTrackingId: string,
  message = 'You can only access your own resources',
): void {
  if (ownerTrackingId !== requestingUserTrackingId) {
    throw new ForbiddenException(message);
  }
}
