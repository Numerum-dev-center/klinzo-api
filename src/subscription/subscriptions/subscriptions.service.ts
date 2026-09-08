import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { KycStatus, Role } from '@prisma/client';
import * as crypto from 'crypto';
import { SubscriptionRepository } from './subscriptions.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/requests/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/requests/update-subscription.dto';
import { CreateSubscriptionDataDto } from './dto/requests/create-subscription-data.dto';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import {
  assertCollectorScope,
  assertUserScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateSubscriptionDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        trackingId: dto.userTrackingId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const offer = await this.prisma.offer.findUnique({
      where: {
        trackingId: dto.offerTrackingId,
      },
      include: { collector: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (
      !offer.isActive ||
      !offer.collector.isActive ||
      offer.collector.kycStatus !== KycStatus.APPROVED
    ) {
      throw new BadRequestException('Offer is not available for subscription');
    }

    const data: CreateSubscriptionDataDto = {
      ...dto,
      qrCodeId: `QR-${crypto.randomUUID()}`,
      startDate: new Date(dto.startDate),
      nextBillingDate: new Date(dto.nextBillingDate),
      userId: user.id,
      offerId: offer.id,
    };

    return this.subscriptionRepository.create(data);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<SubscriptionEntity>> {
    const result = await this.subscriptionRepository.findAll(pageOptionsDto);
    const itemCount = result.total;
    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount,
    });

    return new PageDto(
      result.data.map((subscription) => this.toResponseDto(subscription)),
      pageMetaDto,
    );
  }

  async findAllByCollector(
    collectorTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<SubscriptionEntity>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const result = await this.subscriptionRepository.findAllByCollector(
      collector.id,
      pageOptionsDto,
    );
    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: result.total,
    });

    return new PageDto(
      result.data.map((subscription) => this.toResponseDto(subscription, true)),
      pageMetaDto,
    );
  }

  async findOne(trackingId: string, requestingUser: RequestingUser) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found !!');
    }

    await this.assertCanAccessSubscription(subscription, requestingUser);

    return this.toResponseDto(subscription);
  }

  async update(trackingId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.subscriptionRepository.update(trackingId, dto);
  }

  async remove(trackingId: string) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.subscriptionRepository.remove(trackingId);
  }

  async regenerateQrCode(trackingId: string, requestingUser: RequestingUser) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanAccessSubscription(subscription, requestingUser);
    const newQrCodeId = `QR-${crypto.randomUUID()}`;
    const updated = await this.prisma.subscription.update({
      where: { trackingId },
      data: { qrCodeId: newQrCodeId },
    });
    return this.toResponseDto(updated);
  }

  async suspend(trackingId: string, requestingUser: RequestingUser) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanAccessSubscription(subscription, requestingUser);
    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Only an active subscription can be suspended',
      );
    }
    const updated = await this.prisma.subscription.update({
      where: { trackingId },
      data: { status: 'PAUSED' },
    });
    return this.toResponseDto(updated);
  }

  async reactivate(trackingId: string, requestingUser: RequestingUser) {
    const subscription = await this.subscriptionRepository.findOne(trackingId);
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanAccessSubscription(subscription, requestingUser);
    if (subscription.status !== 'PAUSED') {
      throw new BadRequestException(
        'Only a paused subscription can be reactivated',
      );
    }
    const updated = await this.prisma.subscription.update({
      where: { trackingId },
      data: { status: 'ACTIVE' },
    });
    return this.toResponseDto(updated);
  }

  private async assertCanAccessCollector(
    collectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (!isCollectorRole(requestingUser.role)) return;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    assertCollectorScope(user, collectorId);
  }

  private async assertCanAccessSubscription(
    subscription: {
      user?: { trackingId: string };
      offer?: { collectorId: bigint };
    },
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (requestingUser.role === Role.USAGER) {
      if (!subscription.user) {
        throw new NotFoundException('Subscription owner not found');
      }
      assertUserScope(subscription.user.trackingId, requestingUser.trackingId);
      return;
    }

    if (isCollectorRole(requestingUser.role)) {
      if (!subscription.offer) {
        throw new NotFoundException('Subscription offer not found');
      }
      await this.assertCanAccessCollector(
        subscription.offer.collectorId,
        requestingUser,
      );
    }
  }

  private toResponseDto(
    subscription: any,
    withRelations = false,
  ): SubscriptionEntity {
    return new SubscriptionEntity({
      trackingId: subscription.trackingId,
      qrCodeId: subscription.qrCodeId,
      addressText: subscription.addressText,
      status: subscription.status,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      user:
        withRelations && subscription.user
          ? {
              trackingId: subscription.user.trackingId,
              firstName: subscription.user.firstName,
              lastName: subscription.user.lastName,
              email: subscription.user.email,
              phone: subscription.user.phone,
            }
          : undefined,
      offer:
        withRelations && subscription.offer
          ? {
              trackingId: subscription.offer.trackingId,
              name: subscription.offer.name,
              price: subscription.offer.price,
              frequency: subscription.offer.frequency,
              wasteType: subscription.offer.wasteType,
            }
          : undefined,
    });
  }
}
