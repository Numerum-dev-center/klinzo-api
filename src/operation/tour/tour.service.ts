import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTourDto } from './dto/requests/create-tour.dto';
import { OptimizeRouteDto } from './dto/requests/optimize-route.dto';
import { TourResponse } from './dto/responses/tour.response';
import { OptimizedStopResponse } from './dto/responses/optimized-stop.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { TourStatus } from '@prisma/client';

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTourDto): Promise<TourResponse> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { trackingId: dto.vehicleTrackingId }
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const scheduledDate = new Date(dto.scheduledDate);
    
    let reference = dto.reference;
    if (!reference) {
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      reference = `TOUR-${year}${month}${day}-${randomStr}`;
    }

    const tour = await this.prisma.tour.create({
      data: {
        reference,
        scheduledDate,
        vehicleId: vehicle.id,
        status: TourStatus.PLANNED,
      }
    });

    return new TourResponse(tour as any);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<TourResponse>> {
    const itemCount = await this.prisma.tour.count();
    const tours = await this.prisma.tour.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = tours.map(t => new TourResponse(t as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByVehicle(vehicleTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<TourResponse>> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { trackingId: vehicleTrackingId }
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const where = { vehicleId: vehicle.id };
    const itemCount = await this.prisma.tour.count({ where });
    const tours = await this.prisma.tour.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = tours.map(t => new TourResponse(t as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<TourResponse> {
    const tour = await this.prisma.tour.findUnique({
      where: { trackingId },
      include: {
        _count: {
          select: { collectionEvents: true }
        }
      }
    });
    if (!tour) throw new NotFoundException('Tour not found');
    
    return new TourResponse({
      ...tour,
      collectionEventsCount: tour._count.collectionEvents
    } as any);
  }

  async start(trackingId: string): Promise<TourResponse> {
    const tour = await this.prisma.tour.findUnique({ where: { trackingId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== TourStatus.PLANNED) {
      throw new BadRequestException('Tour is not PLANNED');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.IN_PROGRESS,
        actualStartTime: new Date()
      }
    });
    return new TourResponse(updated as any);
  }

  async complete(trackingId: string): Promise<TourResponse> {
    const tour = await this.prisma.tour.findUnique({ where: { trackingId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== TourStatus.IN_PROGRESS) {
      throw new BadRequestException('Tour is not IN_PROGRESS');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.COMPLETED,
        actualEndTime: new Date()
      }
    });
    return new TourResponse(updated as any);
  }

  async cancel(trackingId: string): Promise<TourResponse> {
    const tour = await this.prisma.tour.findUnique({ where: { trackingId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status === TourStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a COMPLETED tour');
    }

    const updated = await this.prisma.tour.update({
      where: { trackingId },
      data: {
        status: TourStatus.CANCELLED
      }
    });
    return new TourResponse(updated as any);
  }

  async optimizeRoute(dto: OptimizeRouteDto): Promise<OptimizedStopResponse[]> {
    // 1. Fetch all requested subscriptions using raw SQL to get geometry
    const subscriptions: any[] = await this.prisma.$queryRaw`
      SELECT 
        "trackingId", 
        "addressText",
        ST_X("gpsLocation"::geometry) as lng,
        ST_Y("gpsLocation"::geometry) as lat
      FROM "Subscription"
      WHERE "trackingId" = ANY(${dto.subscriptionTrackingIds})
        AND "gpsLocation" IS NOT NULL
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
        const dist = this.haversineDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }

    // 3. Map to response
    return optimized.map((sub, index) => new OptimizedStopResponse({
      subscriptionTrackingId: sub.trackingId,
      addressText: sub.addressText,
      order: index
    }));
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
