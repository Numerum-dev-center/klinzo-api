import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectorApplicationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../shared/prisma/prisma.service';
import { PageMetaDto } from '../shared/pagination/dto/requests/page-meta.dto';
import { PageOptionsDto } from '../shared/pagination/dto/requests/page-options.dto';
import { ActivateCollectorAccountDto } from './dto/activate-collector-account.dto';
import { CreateCollectorApplicationDto } from './dto/create-collector-application.dto';

const INVITATION_HOURS = 72;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('hex');

const applicationSelect = {
  trackingId: true, createdAt: true, companyName: true, registrationNumber: true,
  type: true, adresse: true, firstName: true, lastName: true,
  contactEmail: true, contactPhone: true, status: true, rejectionReason: true,
  collectorTrackingId: true, invitedAt: true, activatedAt: true,
} as const;

@Injectable()
export class CollectorApplicationsService {
  private readonly logger = new Logger(CollectorApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateCollectorApplicationDto) {
    const contactEmail = dto.contactEmail.trim().toLowerCase();
    const existing = await this.prisma.collectorApplication.findFirst({
      where: { contactEmail, status: CollectorApplicationStatus.PENDING },
    });
    if (existing) throw new ConflictException('Une candidature est déjà en cours pour cette adresse e-mail.');
    const [existingUser, existingCollector] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: contactEmail }, select: { id: true } }),
      this.prisma.collector.findFirst({ where: { contactEmail }, select: { id: true } }),
    ]);
    if (existingUser || existingCollector) {
      throw new ConflictException('Cette adresse e-mail est déjà utilisée par un compte.');
    }

    const application = await this.prisma.collectorApplication.create({
      data: {
        companyName: dto.companyName.trim(),
        registrationNumber: dto.registrationNumber.trim(),
        type: dto.type,
        adresse: dto.adresse.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        contactEmail,
        contactPhone: dto.contactPhone.trim(),
      },
      select: { trackingId: true, status: true },
    });
    return application;
  }

  async findAll(page: PageOptionsDto) {
    const [itemCount, data] = await Promise.all([
      this.prisma.collectorApplication.count(),
      this.prisma.collectorApplication.findMany({
        skip: page.skip, take: page.take,
        orderBy: { createdAt: 'desc' },
        select: applicationSelect,
      }),
    ]);
    return { data, meta: new PageMetaDto({ itemCount, pageOptionsDto: page }) };
  }

  async approve(trackingId: string) {
    const application = await this.prisma.collectorApplication.findUnique({ where: { trackingId } });
    if (!application) throw new NotFoundException('Candidature introuvable.');
    if (application.status !== CollectorApplicationStatus.PENDING) {
      throw new BadRequestException('Cette candidature a déjà été traitée.');
    }

    const token = newToken();
    const tokenHash = hashToken(token);
    const inviteExpiresAt = new Date(Date.now() + INVITATION_HOURS * 60 * 60 * 1000);
    const randomPassword = await bcrypt.hash(newToken(), 10);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.collectorApplication.updateMany({
        where: { trackingId, status: CollectorApplicationStatus.PENDING },
        data: { status: CollectorApplicationStatus.APPROVED },
      });
      if (claimed.count !== 1) throw new ConflictException('Cette candidature a déjà été traitée.');

      const [existingUser, existingCollector] = await Promise.all([
        tx.user.findUnique({ where: { email: application.contactEmail } }),
        tx.collector.findFirst({ where: { contactEmail: application.contactEmail } }),
      ]);
      if (existingUser || existingCollector) {
        throw new ConflictException('Cette adresse e-mail est déjà utilisée par un compte.');
      }

      const collector = await tx.collector.create({
        data: {
          companyName: application.companyName,
          registrationNumber: application.registrationNumber,
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          type: application.type,
          adresse: application.adresse,
        },
      });
      const user = await tx.user.create({
        data: {
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.contactEmail,
          phone: application.contactPhone,
          password: randomPassword,
          role: Role.ADMIN_COLLECTEUR,
          isActive: false,
          collectorId: collector.id,
        },
      });
      await tx.collectorApplication.update({
        where: { trackingId },
        data: {
          collectorTrackingId: collector.trackingId,
          userTrackingId: user.trackingId,
          inviteTokenHash: tokenHash,
          inviteExpiresAt,
        },
      });
    });

    const invitationSent = await this.sendInvitation(application.contactEmail, token);
    if (invitationSent) {
      await this.prisma.collectorApplication.update({
        where: { trackingId }, data: { invitedAt: new Date() },
      });
    }
    return { trackingId, status: CollectorApplicationStatus.APPROVED, invitationSent };
  }

  async reject(trackingId: string, reason: string) {
    const result = await this.prisma.collectorApplication.updateMany({
      where: { trackingId, status: CollectorApplicationStatus.PENDING },
      data: { status: CollectorApplicationStatus.REJECTED, rejectionReason: reason.trim() },
    });
    if (result.count !== 1) throw new BadRequestException('Candidature introuvable ou déjà traitée.');
    return { trackingId, status: CollectorApplicationStatus.REJECTED };
  }

  async resendInvitation(trackingId: string) {
    const application = await this.prisma.collectorApplication.findUnique({ where: { trackingId } });
    if (!application || application.status !== CollectorApplicationStatus.APPROVED || application.activatedAt) {
      throw new BadRequestException('Aucune invitation en attente pour cette candidature.');
    }
    const token = newToken();
    await this.prisma.collectorApplication.update({
      where: { trackingId },
      data: {
        inviteTokenHash: hashToken(token),
        inviteExpiresAt: new Date(Date.now() + INVITATION_HOURS * 60 * 60 * 1000),
        invitedAt: null,
      },
    });
    const invitationSent = await this.sendInvitation(application.contactEmail, token);
    if (invitationSent) {
      await this.prisma.collectorApplication.update({
        where: { trackingId }, data: { invitedAt: new Date() },
      });
    }
    return { trackingId, invitationSent };
  }

  async activate(dto: ActivateCollectorAccountDto) {
    const tokenHash = hashToken(dto.token);
    const application = await this.prisma.collectorApplication.findUnique({ where: { inviteTokenHash: tokenHash } });
    if (!application || !application.userTrackingId || !application.inviteExpiresAt ||
        application.inviteExpiresAt.getTime() < Date.now() || application.activatedAt) {
      throw new BadRequestException('Invitation invalide ou expirée.');
    }

    const password = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.collectorApplication.updateMany({
        where: { trackingId: application.trackingId, inviteTokenHash: tokenHash, activatedAt: null },
        data: { inviteTokenHash: null, inviteExpiresAt: null, activatedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('Invitation déjà utilisée.');
      await tx.user.update({
        where: { trackingId: application.userTrackingId! },
        data: { password, isActive: true, emailVerified: true },
      });
    });
    return { message: 'Compte activé. Vous pouvez vous connecter.' };
  }

  private async sendInvitation(email: string, token: string): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const from = this.config.get<string>('SMTP_FROM');
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (!host || !user || !pass || !from || !frontendUrl || !Number.isInteger(port)) {
      this.logger.warn('Invitation non envoyée : configuration SMTP ou FRONTEND_URL manquante.');
      return false;
    }

    try {
      const url = new URL('/activation-collecteur', frontendUrl);
      url.searchParams.set('token', token);
      const transport = nodemailer.createTransport({
        host, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user, pass },
      });
      await transport.sendMail({
        from, to: email,
        subject: 'Activez votre compte collecteur Klinzo',
        text: `Votre candidature Klinzo a été approuvée. Définissez votre mot de passe dans les 72 heures : ${url.toString()}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      });
      return true;
    } catch (error) {
      this.logger.error('Échec de l’envoi de l’invitation collecteur.', error);
      return false;
    }
  }
}
