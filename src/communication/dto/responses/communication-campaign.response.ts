import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommunicationCampaignStatus,
  CommunicationChannel,
} from '@prisma/client';

export class CommunicationCampaignResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CommunicationChannel })
  channel: CommunicationChannel;

  @ApiProperty()
  audience: string;

  @ApiProperty({ enum: CommunicationCampaignStatus })
  status: CommunicationCampaignStatus;

  @ApiPropertyOptional()
  scheduledAt?: Date | null;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiProperty()
  messageSnapshot: string;

  @ApiPropertyOptional()
  template?: {
    trackingId: string;
    name: string;
  } | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(campaign: CommunicationCampaignResponse) {
    Object.assign(this, campaign);
  }
}
