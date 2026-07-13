import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateZoneDto } from './dto/create-zone.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createZoneDto: CreateZoneDto) {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: createZoneDto.collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');

    const geojsonStr = JSON.stringify(createZoneDto.geojson);

    // Using SQL RAW due to PostGIS constraints
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "Zone" (
        "trackingId", name, city, "collectorId", "polygonPostgis", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        ${createZoneDto.name}, 
        ${createZoneDto.city}, 
        ${collector.id}, 
        ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326), 
        NOW()
      ) 
      RETURNING "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson;
    `;

    return result[0];
  }

  async findAll() {
    const result = await this.prisma.$queryRaw`
      SELECT "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson
      FROM "Zone"
      ORDER BY "createdAt" DESC;
    `;
    return result;
  }

  async findOne(trackingId: string) {
    const result: any[] = await this.prisma.$queryRaw`
      SELECT "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson
      FROM "Zone"
      WHERE "trackingId" = ${trackingId};
    `;
    if (!result || result.length === 0) throw new NotFoundException('Zone not found');
    return result[0];
  }

  // Update and remove left simple for MVP PostGIS
}
