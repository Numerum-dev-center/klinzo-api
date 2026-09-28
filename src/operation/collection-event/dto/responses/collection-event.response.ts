import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CollectionStatus,
  DisputeDecision,
  DisputeHistoryAction,
  DisputeMeasure,
  DisputeStatus,
} from '@prisma/client';

export interface DisputeHistoryResponse {
  trackingId: string;
  action: DisputeHistoryAction;
  fromStatus?: DisputeStatus | null;
  toStatus: DisputeStatus;
  decision?: DisputeDecision | null;
  reason?: string | null;
  measure?: DisputeMeasure | null;
  actorTrackingId: string;
  createdAt: Date;
}

export interface DisputeCaseResponse {
  trackingId: string;
  status: DisputeStatus;
  decision?: DisputeDecision | null;
  resolutionReason?: string | null;
  measure: DisputeMeasure;
  assignedTo?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  history: DisputeHistoryResponse[];
}

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
  dispute?: DisputeCaseResponse;

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
  hasRating: boolean;

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
      disputeCase?: DisputeCaseResponse | null;
      rating?: { trackingId?: string } | null;
    };

    this.trackingId = partial.trackingId!;
    this.status = partial.status!;
    this.executedAt = partial.executedAt;
    this.photoUrl = partial.photoUrl;
    this.qrScanData = partial.qrScanData;
    this.autoValidationDeadline = partial.autoValidationDeadline;
    this.disputeReason = partial.disputeReason;
    this.dispute = source.disputeCase
      ? {
          trackingId: source.disputeCase.trackingId,
          status: source.disputeCase.status,
          decision: source.disputeCase.decision,
          resolutionReason: source.disputeCase.resolutionReason,
          measure: source.disputeCase.measure,
          assignedTo: source.disputeCase.assignedTo,
          resolvedBy: source.disputeCase.resolvedBy,
          resolvedAt: source.disputeCase.resolvedAt,
          createdAt: source.disputeCase.createdAt,
          updatedAt: source.disputeCase.updatedAt,
          history: (source.disputeCase.history ?? []).map((entry) => ({
            trackingId: entry.trackingId,
            action: entry.action,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            decision: entry.decision,
            reason: entry.reason,
            measure: entry.measure,
            actorTrackingId: entry.actorTrackingId,
            createdAt: entry.createdAt,
          })),
        }
      : partial.dispute;
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
    this.hasRating = Boolean(source.rating);
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}
