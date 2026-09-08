import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionStatus } from '@prisma/client';

export class CollectionEventResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty({ enum: CollectionStatus })
  status: CollectionStatus;

  @ApiPropertyOptional()
  executedAt?: Date | null;

  @ApiPropertyOptional()
  photoUrl?: string | null;

  @ApiPropertyOptional()
  qrScanData?: string | null;

  @ApiPropertyOptional()
  autoValidationDeadline?: Date | null;

  @ApiPropertyOptional()
  disputeReason?: string | null;

  @ApiPropertyOptional()
  subscriptionTrackingId?: string;

  @ApiPropertyOptional()
  user?: {
    trackingId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional()
  collector?: {
    trackingId?: string;
    companyName?: string;
  };

  @ApiPropertyOptional()
  offer?: {
    trackingId?: string;
    name?: string;
    price?: number;
    frequency?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<CollectionEventResponse>) {
    const source = partial as Partial<CollectionEventResponse> & {
      subscription?: {
        trackingId?: string;
        user?: CollectionEventResponse['user'];
        offer?: CollectionEventResponse['offer'] & {
          collector?: CollectionEventResponse['collector'];
        };
      };
    };

    this.trackingId = partial.trackingId!;
    this.status = partial.status!;
    this.executedAt = partial.executedAt;
    this.photoUrl = partial.photoUrl;
    this.qrScanData = partial.qrScanData;
    this.autoValidationDeadline = partial.autoValidationDeadline;
    this.disputeReason = partial.disputeReason;
    this.subscriptionTrackingId =
      partial.subscriptionTrackingId ?? source.subscription?.trackingId;
    this.user = source.subscription?.user
      ? {
          trackingId: source.subscription.user.trackingId,
          firstName: source.subscription.user.firstName,
          lastName: source.subscription.user.lastName,
          email: source.subscription.user.email,
          phone: source.subscription.user.phone,
        }
      : partial.user;
    this.collector = source.subscription?.offer?.collector
      ? {
          trackingId: source.subscription.offer.collector.trackingId,
          companyName: source.subscription.offer.collector.companyName,
        }
      : partial.collector;
    this.offer = source.subscription?.offer
      ? {
          trackingId: source.subscription.offer.trackingId,
          name: source.subscription.offer.name,
          price: source.subscription.offer.price,
          frequency: source.subscription.offer.frequency,
        }
      : partial.offer;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}
