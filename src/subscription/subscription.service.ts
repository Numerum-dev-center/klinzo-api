import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionRequest } from './dto/create-subscription.dto';
import { PrismaService } from '../shared/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionRequest) {
    const user = await this.prisma.user.findUnique({
      where: { trackingId: dto.userTrackingId }
    });
    if (!user) throw new NotFoundException('User not found');

    const offer = await this.prisma.offer.findUnique({
      where: { trackingId: dto.offerTrackingId }
    });
    if (!offer) throw new NotFoundException('Offer not found');

    const qrCodeId = crypto.randomUUID().split('-')[0].toUpperCase(); // Simple short ID for QR

    let result;
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO "Subscription" (
          "trackingId", "qrCodeId", "addressText", "userId", "offerId", "gpsLocation", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${qrCodeId},
          ${dto.addressText},
          ${user.id},
          ${offer.id},
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326),
          NOW()
        )
        RETURNING "trackingId", "qrCodeId", "addressText", "status", "startDate", "nextBillingDate", "createdAt", "updatedAt", ST_AsGeoJSON("gpsLocation")::json as "gpsLocation";
      `;
    } else {
      result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO "Subscription" (
          "trackingId", "qrCodeId", "addressText", "userId", "offerId", "gpsLocation", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${qrCodeId},
          ${dto.addressText},
          ${user.id},
          ${offer.id},
          NULL,
          NOW()
        )
        RETURNING "trackingId", "qrCodeId", "addressText", "status", "startDate", "nextBillingDate", "createdAt", "updatedAt", NULL as "gpsLocation";
      `;
    }

    return result[0];
  }

  async findAll() {
    return this.prisma.$queryRaw<any[]>`
      SELECT "trackingId", "qrCodeId", "addressText", "status", "startDate", "nextBillingDate", "createdAt", "updatedAt", ST_AsGeoJSON("gpsLocation")::json as "gpsLocation"
      FROM "Subscription"
      ORDER BY "createdAt" DESC;
    `;
  }

  async findOne(trackingId: string) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT "trackingId", "qrCodeId", "addressText", "status", "startDate", "nextBillingDate", "createdAt", "updatedAt", ST_AsGeoJSON("gpsLocation")::json as "gpsLocation"
      FROM "Subscription"
      WHERE "trackingId" = ${trackingId};
    `;
    if (!result || result.length === 0) throw new NotFoundException('Subscription not found');
    return result[0];
  }

  async findStatusSubscription(status: string) {
    // Requires exact string matching for enum in raw SQL, casting using ::"SubscriptionStatus"
    return this.prisma.$queryRaw<any[]>`
      SELECT "trackingId", "qrCodeId", "addressText", "status", "startDate", "nextBillingDate", "createdAt", "updatedAt", ST_AsGeoJSON("gpsLocation")::json as "gpsLocation"
      FROM "Subscription"
      WHERE "status"::text = ${status}
      ORDER BY "createdAt" DESC;
    `;
  }
}
