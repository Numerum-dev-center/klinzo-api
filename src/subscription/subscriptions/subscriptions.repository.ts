import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDataDto } from './dto/create-subscription-data.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDataDto) {
    const {
      latitude,
      longitude,
      ...subscriptionData
    } = createSubscriptionDto;

    try {
      const result = await this.prisma.$queryRaw<any[]>`
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

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        include: {
          user: true,
          offer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.subscription.count(),
    ]);

    return {
      data,
      total,
    };
  }

  async findOne(trackingId: string) {
    return this.prisma.subscription.findUnique({
      where: {
        trackingId,
      },
      include: {
        user: true,
        offer: true,
      },
    });
  }

  async update(
    trackingId: string,
    data: UpdateSubscriptionDto,
  ) {
    return this.prisma.subscription.update({
      where: {
        trackingId,
      },
      data,
    });
  }

  async remove(trackingId: string) {
    return this.prisma.subscription.delete({
      where: {
        trackingId,
      },
    });
  }
}