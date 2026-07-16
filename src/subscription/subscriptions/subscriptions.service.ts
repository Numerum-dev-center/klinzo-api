import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const {
      latitude,
      longitude,
      ...subscriptionData
    } = createSubscriptionDto;

    return this.prisma.$queryRaw`
      INSERT INTO "Subscription"
      (
        "qrCodeId",
        "gpsLocation",
        "addressText",
        "status",
        "startDate",
        "nextBillingDate",
        "userId",
        "offerId",
        "trackingId",
        "createdAt",
        "updatedAt"
      )
      VALUES
      (
        ${subscriptionData.qrCodeId},
        ST_SetSRID(
          ST_MakePoint(${longitude}, ${latitude}),
          4326
        )::geography,
        ${subscriptionData.addressText},
        ${subscriptionData.status}::"SubscriptionStatus",
        ${subscriptionData.startDate},
        ${subscriptionData.nextBillingDate},
        ${subscriptionData.userId},
        ${subscriptionData.offerId},
        gen_random_uuid(),
        NOW(),
        NOW()
      )
      RETURNING *
    `;
  }


  async findAll() {
    return this.prisma.subscription.findMany({
      include: {
        user: true,
        offer: true,
      },
    });
  }


  async findOne(id: number) {
    return this.prisma.subscription.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        offer: true,
      },
    });
  }


  async update(
    id: number,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.prisma.subscription.update({
      where: {
        id,
      },
      data: {
        ...updateSubscriptionDto,
      },
    });
  }


  async remove(id: number) {
    return this.prisma.subscription.delete({
      where: {
        id,
      },
    });
  }
}