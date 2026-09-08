import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTourDto } from './dto/requests/create-tour.dto';
import { OptimizeRouteDto } from './dto/requests/optimize-route.dto';
import { TourResponse } from './dto/responses/tour.response';
import { OptimizedStopResponse } from './dto/responses/optimized-stop.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { TourStatus } from '@prisma/client';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateTourDto,
    requestingUser: RequestingUser,
  ): Promise<TourResponse> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { trackingId: dto.vehicleTrackingId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.assertCanAccessCollector(vehicle.collectorId, requestingUser);

    const scheduledDate = new Date(dto.scheduledDate);

    let reference = dto.reference;
    if (!reference) {
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const randomStr = crypto.randomUUID().slice(0, 4).toUpperCase();
      reference = `TOUR-${year}${month}${day}-${randomStr}`;
    }

    const tour = await this.prisma.tour.create({
      data: {
        reference,
        scheduledDate,
        vehicleId: vehicle.id,
        status: TourStatus.PLANNED,
      },
    });

    return new TourResponse(tour);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<TourResponse>> {
    const itemCount = await this.prisma.tour.count();
    const tours = await this.prisma.tour.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = tours.map((t) => new TourResponse(t));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByVehicle(
    vehicleTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<TourResponse>> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { trackingId: vehicleTrackingId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.assertCanAccessCollector(vehicle.collectorId, requestingUser);

    const where = { vehicleId: vehicle.id };
    const itemCount = await this.prisma.tour.count({ where });
    const tours = await this.prisma.tour.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = tours.map((t) => new TourResponse(t));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<TourResponse> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: {
        vehicle: true,
        _count: {
          select: { collectionEvents: true },
        },
      },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    await this.assertCanAccessCollector(
      tour.vehicle.collectorId,
      requestingUser,
    );

    return new TourResponse({
      ...tour,
      collectionEventsCount: tour._count.collectionEvents,
    });
  }

  async start(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<TourResponse> {
    const tour = await this.findTourWithVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(
      tour.vehicle.collectorId,
      requestingUser,
    );
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== TourStatus.PLANNED) {
      throw new BadRequestException('Tour is not PLANNED');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      },
    });
    return new TourResponse(updated);
  }

  async complete(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<TourResponse> {
    const tour = await this.findTourWithVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(
      tour.vehicle.collectorId,
      requestingUser,
    );
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== TourStatus.IN_PROGRESS) {
      throw new BadRequestException('Tour is not IN_PROGRESS');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.COMPLETED,
        actualEndTime: new Date(),
      },
    });
    return new TourResponse(updated);
  }

  async cancel(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<TourResponse> {
    const tour = await this.findTourWithVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(
      tour.vehicle.collectorId,
      requestingUser,
    );
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status === TourStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a COMPLETED tour');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.CANCELLED,
      },
    });
    return new TourResponse(updated);
  }

  async optimizeRoute(
    dto: OptimizeRouteDto,
    requestingUser: RequestingUser,
  ): Promise<OptimizedStopResponse[]> {
    const collectorId = await this.getRequesterCollectorId(requestingUser);

    // 1. Fetch all requested subscriptions using raw SQL to get geometry
    const subscriptions: any[] = await this.prisma.$queryRaw`
      SELECT
        s."trackingId",
        s."addressText",
        ST_X(s."gpsLocation"::geometry) as lng,
        ST_Y(s."gpsLocation"::geometry) as lat
      FROM "Subscription" s
      INNER JOIN "Offer" o ON o.id = s."offerId"
      WHERE s."trackingId" = ANY(${dto.subscriptionTrackingIds})
        AND s."gpsLocation" IS NOT NULL
        AND (${collectorId ?? null}::bigint IS NULL OR o."collectorId" = ${collectorId ?? null})
    `;

    // Ignore silently if some don't exist or have no gpsLocation
    if (subscriptions.length === 0) {
      return [];
    }

    // 2. Nearest-neighbor algorithm
    const unvisited = [...subscriptions];
    const optimized: any[] = [];

    // Start with the first one in the list (or arbitrary)
    let current = unvisited.shift();
    optimized.push(current);

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.haversineDistance(
          current.lat,
          current.lng,
          unvisited[i].lat,
          unvisited[i].lng,
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }

    // 3. Map to response
    return optimized.map(
      (sub, index) =>
        new OptimizedStopResponse({
          subscriptionTrackingId: sub.trackingId,
          addressText: sub.addressText,
          order: index,
        }),
    );
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async findTourWithVehicleOrThrow(trackingId: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: { vehicle: true },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    return tour;
  }

  private async getRequesterCollectorId(
    requestingUser: RequestingUser,
  ): Promise<bigint | undefined> {
    if (!isCollectorRole(requestingUser.role)) return undefined;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    if (!user?.collectorId) {
      assertCollectorScope(user ?? null, BigInt(-1));
      return undefined;
    }
    return user.collectorId;
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
}
