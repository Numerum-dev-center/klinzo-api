import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateZoneDto } from './dto/requests/create-zone.dto';
import { UpdateZoneDto } from './dto/requests/update-zone.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ZoneEntity } from './entities/zone.entity';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createZoneDto: CreateZoneDto): Promise<ZoneEntity> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createZoneDto.collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const geojsonStr = JSON.stringify(createZoneDto.geojson);

    // Using SQL RAW due to PostGIS constraints
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "Zone" (
        "trackingId", name, city, "polygonPostgis", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        ${createZoneDto.name}, 
        ${createZoneDto.city}, 
        ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326), 
        NOW()
      ) 
      RETURNING "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson;
    `;

    const newZone = result[0];

    // Automatically assign the creator if provided
    if (collector) {
      const zoneDb = await this.prisma.zone.findUnique({ where: { trackingId: newZone.trackingId }});
      if (zoneDb) {
        await this.prisma.collectorZone.create({
          data: {
            collectorId: collector.id,
            zoneId: zoneDb.id
          }
        });
      }
    }

    return new ZoneEntity(newZone);
  }

  async findAll(): Promise<ZoneEntity[]> {
    const result = await this.prisma.$queryRaw`
      SELECT "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson
      FROM "Zone"
      ORDER BY "createdAt" DESC;
    `;
    return (result as any[]).map((zone) => new ZoneEntity(zone));
  }

  async findOne(trackingId: string): Promise<ZoneEntity> {
    const result: any[] = await this.prisma.$queryRaw`
      SELECT "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson
      FROM "Zone"
      WHERE "trackingId" = ${trackingId};
    `;
    if (!result || result.length === 0) throw new NotFoundException('Zone not found');
    return new ZoneEntity(result[0]);
  }

  async update(trackingId: string, dto: UpdateZoneDto): Promise<ZoneEntity> {
    await this.findOne(trackingId); // verifies existence or throws NotFoundException

    if (dto.geojson) {
      const geojsonStr = JSON.stringify(dto.geojson);
      // Raw SQL update to handle PostGIS geometry
      await this.prisma.$executeRaw`
        UPDATE "Zone"
        SET 
          name = COALESCE(${dto.name ?? null}, name),
          city = COALESCE(${dto.city ?? null}, city),
          "isActive" = COALESCE(${dto.isActive ?? null}, "isActive"),
          "polygonPostgis" = ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326),
          "updatedAt" = NOW()
        WHERE "trackingId" = ${trackingId};
      `;
    } else {
      await this.prisma.zone.update({
        where: { trackingId },
        data: {
          name: dto.name,
          city: dto.city,
          isActive: dto.isActive
        }
      });
    }

    return this.findOne(trackingId);
  }

  async remove(trackingId: string): Promise<ZoneEntity> {
    await this.findOne(trackingId);
    await this.prisma.zone.update({
      where: { trackingId },
      data: { isActive: false }
    });
    return this.findOne(trackingId);
  }

  async assignCollectors(zoneTrackingId: string, collectorTrackingIds: string[]) {
    const zone = await this.prisma.zone.findUnique({ where: { trackingId: zoneTrackingId } });
    if (!zone) throw new NotFoundException('Zone not found');

    const collectors = await this.prisma.collector.findMany({
      where: { trackingId: { in: collectorTrackingIds } }
    });

    if (collectors.length === 0) throw new NotFoundException('No valid collectors found');

    const data = collectors.map(c => ({
      collectorId: c.id,
      zoneId: zone.id
    }));

    // Ignore duplicates if they are already assigned (Prisma createMany with skipDuplicates)
    await this.prisma.collectorZone.createMany({
      data,
      skipDuplicates: true,
    });

    return { message: `${collectors.length} collecteurs assignés avec succès à la zone` };
  }

  async findZonesByCollector(collectorTrackingId: string): Promise<ZoneEntity[]> {
    const collector = await this.prisma.collector.findUnique({ where: { trackingId: collectorTrackingId } });
    if (!collector) throw new NotFoundException('Collector not found');

    // M:N raw query to fetch zones and their geojson
    const result = await this.prisma.$queryRaw`
      SELECT z."trackingId", z.name, z.city, z."isActive", z."createdAt", z."updatedAt", ST_AsGeoJSON(z."polygonPostgis")::json as geojson
      FROM "Zone" z
      INNER JOIN "CollectorZone" cz ON z.id = cz."zoneId"
      WHERE cz."collectorId" = ${collector.id}
      ORDER BY z."createdAt" DESC;
    `;
    return (result as any[]).map((zone) => new ZoneEntity(zone));
  }
}
