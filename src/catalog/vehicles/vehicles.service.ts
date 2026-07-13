import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { VehicleResponse } from './dto/vehicle.response';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/page-meta.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleResponse> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createVehicleDto.collectorTrackingId }
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const existingMatricule = await this.prisma.vehicle.findUnique({
      where: { matricule: createVehicleDto.matricule }
    });
    if (existingMatricule) throw new ConflictException('Matricule already exists');

    const { collectorTrackingId, ...data } = createVehicleDto;

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...data,
        collectorId: collector.id
      }
    });

    return new VehicleResponse(vehicle as any);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<VehicleResponse>> {
    const itemCount = await this.prisma.vehicle.count();
    const vehicles = await this.prisma.vehicle.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = vehicles.map(v => new VehicleResponse(v as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(collectorTrackingId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<VehicleResponse>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId }
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.vehicle.count({ where });
    const vehicles = await this.prisma.vehicle.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.size,
      orderBy: { createdAt: 'desc' }
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = vehicles.map(v => new VehicleResponse(v as any));
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<VehicleResponse> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { trackingId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return new VehicleResponse(vehicle as any);
  }

  async update(trackingId: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleResponse> {
    await this.findOne(trackingId); // check exists
    
    // We ignore updating collectorTrackingId in this basic update
    const { collectorTrackingId, ...data } = updateVehicleDto;
    
    if (data.matricule) {
       const existing = await this.prisma.vehicle.findUnique({ where: { matricule: data.matricule }});
       if (existing && existing.trackingId !== trackingId) {
        throw new ConflictException(
          'Matricule already used by another vehicle',
        );
       }
    }

    const updated = await this.prisma.vehicle.update({
      where: { trackingId },
      data
    });
    return new VehicleResponse(updated as any);
  }

  async remove(trackingId: string): Promise<void> {
    await this.findOne(trackingId);
    // Soft delete
    await this.prisma.vehicle.update({
      where: { trackingId },
      data: { isActive: false }
    });
  }
}
