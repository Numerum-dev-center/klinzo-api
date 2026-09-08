import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunicationCampaignStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma/prisma.service';
import { PageDto } from '../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../shared/pagination/dto/requests/page-meta.dto';
import { PageOptionsDto } from '../shared/pagination/dto/requests/page-options.dto';
import { CreateCommunicationCampaignDto } from './dto/requests/create-communication-campaign.dto';
import { CreateMessageTemplateDto } from './dto/requests/create-message-template.dto';
import { CommunicationCampaignResponse } from './dto/responses/communication-campaign.response';
import { MessageTemplateResponse } from './dto/responses/message-template.response';

const campaignInclude = {
  template: {
    select: {
      trackingId: true,
      name: true,
    },
  },
};

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(
    dto: CreateMessageTemplateDto,
  ): Promise<MessageTemplateResponse> {
    const template = await this.prisma.messageTemplate.create({
      data: {
        name: dto.name,
        channel: dto.channel,
        language: dto.language ?? 'fr',
        subject: dto.subject,
        content: dto.content,
        isActive: dto.isActive ?? true,
      },
    });

    return new MessageTemplateResponse(template);
  }

  async findTemplates(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<MessageTemplateResponse>> {
    const itemCount = await this.prisma.messageTemplate.count();
    const templates = await this.prisma.messageTemplate.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      templates.map((template) => new MessageTemplateResponse(template)),
      pageMetaDto,
    );
  }

  async createCampaign(
    dto: CreateCommunicationCampaignDto,
  ): Promise<CommunicationCampaignResponse> {
    const template = dto.templateTrackingId
      ? await this.prisma.messageTemplate.findUnique({
          where: { trackingId: dto.templateTrackingId },
        })
      : null;

    if (dto.templateTrackingId && !template) {
      throw new NotFoundException('Message template not found');
    }

    if (template && template.channel !== dto.channel) {
      throw new BadRequestException(
        'Campaign channel must match template channel',
      );
    }

    const messageSnapshot = template?.content ?? dto.message;
    if (!messageSnapshot) {
      throw new BadRequestException('Campaign message is required');
    }

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        name: dto.name,
        channel: dto.channel,
        audience: dto.audience,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.scheduledAt
          ? CommunicationCampaignStatus.SCHEDULED
          : CommunicationCampaignStatus.DRAFT,
        templateId: template?.id,
        messageSnapshot,
      },
      include: campaignInclude,
    });

    return new CommunicationCampaignResponse(campaign);
  }

  async findCampaigns(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CommunicationCampaignResponse>> {
    const itemCount = await this.prisma.communicationCampaign.count();
    const campaigns = await this.prisma.communicationCampaign.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
      include: campaignInclude,
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      campaigns.map((campaign) => new CommunicationCampaignResponse(campaign)),
      pageMetaDto,
    );
  }

  async markSent(trackingId: string): Promise<CommunicationCampaignResponse> {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { trackingId },
    });
    if (!campaign)
      throw new NotFoundException('Communication campaign not found');
    if (campaign.status === CommunicationCampaignStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled campaigns cannot be marked as sent',
      );
    }

    const updated = await this.prisma.communicationCampaign.update({
      where: { trackingId },
      data: {
        status: CommunicationCampaignStatus.SENT,
        sentAt: new Date(),
      },
      include: campaignInclude,
    });

    return new CommunicationCampaignResponse(updated);
  }

  async cancelCampaign(
    trackingId: string,
  ): Promise<CommunicationCampaignResponse> {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { trackingId },
    });
    if (!campaign)
      throw new NotFoundException('Communication campaign not found');
    if (campaign.status === CommunicationCampaignStatus.SENT) {
      throw new BadRequestException('Sent campaigns cannot be cancelled');
    }

    const updated = await this.prisma.communicationCampaign.update({
      where: { trackingId },
      data: { status: CommunicationCampaignStatus.CANCELLED },
      include: campaignInclude,
    });

    return new CommunicationCampaignResponse(updated);
  }
}
