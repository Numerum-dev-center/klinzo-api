import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel } from '@prisma/client';

export class MessageTemplateResponse {
  @ApiProperty()
  trackingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CommunicationChannel })
  channel: CommunicationChannel;

  @ApiProperty()
  language: string;

  @ApiPropertyOptional()
  subject?: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(template: MessageTemplateResponse) {
    Object.assign(this, template);
  }
}
