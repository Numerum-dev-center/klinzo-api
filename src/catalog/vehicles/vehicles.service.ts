import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateVehicleDto } from './dto/requests/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/requests/update-vehicle.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { VehicleResponse } from './dto/responses/vehicle.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    requestingUser: RequestingUser,
  ): Promise<VehicleResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createVehicleDto.collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const existingMatricule = await this.prisma.vehicle.findUnique({
      where: { matricule: createVehicleDto.matricule },
    });
    if (existingMatricule)
      throw new ConflictException('Matricule already exists');

    const { collectorTrackingId, ...data } = createVehicleDto;

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...data,
        collectorId: collector.id,
      },
    });

    return new VehicleResponse(vehicle);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<VehicleResponse>> {
    const itemCount = await this.prisma.vehicle.count();
    const vehicles = await this.prisma.vehicle.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = vehicles.map((v) => new VehicleResponse(v));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(
    collectorTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<VehicleResponse>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.vehicle.count({ where });
    const vehicles = await this.prisma.vehicle.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = vehicles.map((v) => new VehicleResponse(v));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<VehicleResponse> {
    const vehicle = await this.findVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(vehicle.collectorId, requestingUser);
    return new VehicleResponse(vehicle);
  }

  async update(
    trackingId: string,
    updateVehicleDto: UpdateVehicleDto,
    requestingUser: RequestingUser,
  ): Promise<VehicleResponse> {
    const vehicle = await this.findVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(vehicle.collectorId, requestingUser);

    // We ignore updating collectorTrackingId in this basic update
    const { collectorTrackingId, ...data } = updateVehicleDto;

    if (data.matricule) {
      const existing = await this.prisma.vehicle.findUnique({
        where: { matricule: data.matricule },
      });
      if (existing && existing.trackingId !== trackingId) {
        throw new ConflictException(
          'Matricule already used by another vehicle',
        );
      }
    }

    const updated = await this.prisma.vehicle.update({
      where: { trackingId },
      data,
    });
    return new VehicleResponse(updated);
  }

  async remove(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<void> {
    const vehicle = await this.findVehicleOrThrow(trackingId);
    await this.assertCanAccessCollector(vehicle.collectorId, requestingUser);
    // Soft delete
    await this.prisma.vehicle.update({
      where: { trackingId },
      data: { isActive: false },
    });
  }

  private async findVehicleOrThrow(trackingId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { trackingId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
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
