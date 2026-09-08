import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDataDto } from './dto/requests/create-subscription-data.dto';
import { UpdateSubscriptionDto } from './dto/requests/update-subscription.dto';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubscriptionDto: CreateSubscriptionDataDto) {
    const { latitude, longitude, ...subscriptionData } = createSubscriptionDto;

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
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
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

  async findAllByCollector(
    collectorId: bigint,
    pageOptionsDto: PageOptionsDto,
  ) {
    const where = { offer: { collectorId } };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        include: {
          user: true,
          offer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      total,
    };
  }

  findOne(trackingId: string) {
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

  update(trackingId: string, data: UpdateSubscriptionDto) {
    return this.prisma.subscription.update({
      where: {
        trackingId,
      },
      data,
    });
  }

  remove(trackingId: string) {
    return this.prisma.subscription.delete({
      where: {
        trackingId,
      },
    });
  }
}
