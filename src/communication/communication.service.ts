import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommunicationCampaignStatus,
  CommunicationChannel,
  Role,
} from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../shared/prisma/prisma.service';
import { buildKlinzoEmail } from '../shared/mail/klinzo-email-template';
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

type EmailRecipient = {
  email: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async resolveEmailRecipients(
    audience: string,
  ): Promise<EmailRecipient[]> {
    if (audience === 'COLLECTORS') {
      const [users, collectors] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            isActive: true,
            emailVerified: true,
            role: { in: [Role.ADMIN_COLLECTEUR, Role.AGENT_COLLECTEUR] },
          },
          select: { email: true, firstName: true, lastName: true },
        }),
        this.prisma.collector.findMany({
          where: { isActive: true },
          select: { contactEmail: true, companyName: true },
        }),
      ]);
      const recipients = new Map<string, EmailRecipient>();
      for (const user of users) {
        recipients.set(user.email.toLowerCase(), user);
      }
      for (const collector of collectors) {
        const email = collector.contactEmail.toLowerCase();
        if (!recipients.has(email)) {
          recipients.set(email, {
            email: collector.contactEmail,
            firstName: collector.companyName,
            lastName: '',
          });
        }
      }
      return [...recipients.values()];
    }

    const where =
      audience === 'SUBSCRIBERS'
        ? { isActive: true, emailVerified: true, subscriptions: { some: {} } }
        : audience === 'INACTIVE_USERS'
          ? { isActive: false, emailVerified: true }
          : audience === 'ALL_USERS'
            ? { isActive: true, emailVerified: true }
            : null;

    if (!where) throw new BadRequestException('Unsupported campaign audience');
    const users = await this.prisma.user.findMany({
      where,
      select: { email: true, firstName: true, lastName: true },
    });
    return [
      ...new Map(
        users.map((user) => [user.email.toLowerCase(), user]),
      ).values(),
    ];
  }

  private personalize(content: string, recipient: EmailRecipient): string {
    const fullName = `${recipient.firstName} ${recipient.lastName}`.trim();
    return content
      .replaceAll('{{prenom}}', recipient.firstName)
      .replaceAll('{{nom}}', recipient.lastName)
      .replaceAll('{{nom_complet}}', fullName)
      .replaceAll('{{email}}', recipient.email);
  }

  private async sendEmailCampaign(campaign: {
    audience: string;
    name: string;
    messageSnapshot: string;
    templateId: bigint | null;
  }): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException('SMTP configuration is incomplete');
    }

    const recipients = await this.resolveEmailRecipients(campaign.audience);
    if (recipients.length === 0) {
      throw new BadRequestException(
        'No eligible email recipient for this audience',
      );
    }

    const template = campaign.templateId
      ? await this.prisma.messageTemplate.findUnique({
          where: { id: campaign.templateId },
          select: { subject: true },
        })
      : null;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 50,
    });
    const subject = template?.subject?.trim() || campaign.name;

    try {
      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          const personalizedMessage = this.personalize(
            campaign.messageSnapshot,
            recipient,
          );
          await transport.sendMail({
            from,
            to: recipient.email,
            subject: this.personalize(subject, recipient),
            text: personalizedMessage,
            html: buildKlinzoEmail({
              title: this.personalize(subject, recipient),
              message: personalizedMessage,
              action: this.config.get<string>('FRONTEND_URL')
                ? {
                    label: 'Accéder à KLINZO',
                    url: this.config.get<string>('FRONTEND_URL')!,
                  }
                : undefined,
            }),
          });
        }),
      );
      const failedCount = results.filter(
        (result) => result.status === 'rejected',
      ).length;
      if (failedCount > 0) {
        throw new Error(`${failedCount} email(s) could not be delivered`);
      }
    } catch (error) {
      this.logger.error(
        `Campaign email delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'The email campaign could not be sent',
      );
    }
  }

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
    if (campaign.status === CommunicationCampaignStatus.SENT) {
      throw new BadRequestException('Campaign has already been sent');
    }
    if (campaign.channel !== CommunicationChannel.EMAIL) {
      throw new BadRequestException(
        'Only email campaign delivery is currently available',
      );
    }

    await this.sendEmailCampaign(campaign);

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
