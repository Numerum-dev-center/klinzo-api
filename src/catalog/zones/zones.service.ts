import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { CreateZoneDto } from './dto/requests/create-zone.dto';
import { UpdateZoneDto } from './dto/requests/update-zone.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ZoneEntity } from './entities/zone.entity';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createZoneDto: CreateZoneDto,
    requestingUser: RequestingUser,
  ): Promise<ZoneEntity> {
    const collector = createZoneDto.collectorTrackingId
      ? await this.prisma.collector.findUnique({
          where: { trackingId: createZoneDto.collectorTrackingId },
        })
      : null;
    if (createZoneDto.collectorTrackingId && !collector) {
      throw new NotFoundException('Collector not found');
    }
    if (collector) {
      await this.assertCanAccessCollector(collector.id, requestingUser);
    }

    const geojsonStr = JSON.stringify(createZoneDto.geojson);

    // Using SQL RAW due to PostGIS constraints
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "Zone" (
        "trackingId", name, city, "polygonPostgis", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        ${createZoneDto.name}, 
        ${createZoneDto.city ?? null}, 
        ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326), 
        NOW()
      ) 
      RETURNING "trackingId", name, city, "isActive", "createdAt", "updatedAt", ST_AsGeoJSON("polygonPostgis")::json as geojson;
    `;

    const newZone = result[0];

    // Automatically assign the creator if provided
    if (collector) {
      const zoneDb = await this.prisma.zone.findUnique({
        where: { trackingId: newZone.trackingId },
      });
      if (zoneDb) {
        await this.prisma.collectorZone.create({
          data: {
            collectorId: collector.id,
            zoneId: zoneDb.id,
          },
        });
      }
    }

    return this.findOne(newZone.trackingId, requestingUser);
  }

  async findAll(): Promise<ZoneEntity[]> {
    const result = await this.prisma.$queryRaw`
      SELECT
        z."trackingId",
        z.name,
        z.city,
        z."isActive",
        z."createdAt",
        z."updatedAt",
        ST_AsGeoJSON(z."polygonPostgis")::json as geojson,
        COALESCE(
          json_agg(
            json_build_object(
              'trackingId', c."trackingId",
              'companyName', c."companyName"
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as collectors
      FROM "Zone" z
      LEFT JOIN "CollectorZone" cz ON z.id = cz."zoneId"
      LEFT JOIN "Collector" c ON c.id = cz."collectorId"
      GROUP BY z.id
      ORDER BY z."createdAt" DESC;
    `;
    return (result as any[]).map((zone) => new ZoneEntity(zone));
  }

  async findAvailableForCollector(requestingUser: RequestingUser) {
    const collector = await this.getRequesterCollector(requestingUser);
    const [zones, assignments, zoneRecords] = await Promise.all([
      this.findAll(),
      this.prisma.collectorZone.findMany({
        where: { collectorId: collector.id },
        select: { zoneId: true },
      }),
      this.prisma.zone.findMany({
        select: { id: true, trackingId: true },
      }),
    ]);
    const selectedIds = new Set(assignments.map((item) => item.zoneId));
    const selectedTrackingIds = new Set(
      zoneRecords
        .filter((zone) => selectedIds.has(zone.id))
        .map((zone) => zone.trackingId),
    );
    return zones
      .filter((zone) => zone.isActive)
      .map((zone) => ({
        ...zone,
        collectors: undefined,
        selected: selectedTrackingIds.has(zone.trackingId),
      }));
  }

  async selectForCollector(
    zoneTrackingId: string,
    requestingUser: RequestingUser,
  ) {
    const collector = await this.getRequesterCollector(requestingUser);
    if (!collector.isActive || collector.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        'Votre KYC doit être approuvé avant de sélectionner une zone.',
      );
    }
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: zoneTrackingId },
      select: { id: true, isActive: true },
    });
    if (!zone || !zone.isActive) {
      throw new NotFoundException('Zone active introuvable.');
    }
    await this.prisma.collectorZone.upsert({
      where: {
        collectorId_zoneId: { collectorId: collector.id, zoneId: zone.id },
      },
      create: { collectorId: collector.id, zoneId: zone.id },
      update: {},
    });
    return { zoneTrackingId, selected: true };
  }

  async unselectForCollector(
    zoneTrackingId: string,
    requestingUser: RequestingUser,
  ) {
    const collector = await this.getRequesterCollector(requestingUser);
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: zoneTrackingId },
      select: { id: true },
    });
    if (!zone) throw new NotFoundException('Zone introuvable.');
    const offers = await this.prisma.offer.count({
      where: { collectorId: collector.id, zoneId: zone.id },
    });
    if (offers > 0) {
      throw new ConflictException(
        'Cette zone est utilisée par une offre. Désactivez ou supprimez d’abord les offres associées.',
      );
    }
    await this.prisma.collectorZone.deleteMany({
      where: { collectorId: collector.id, zoneId: zone.id },
    });
    return { zoneTrackingId, selected: false };
  }

  async findOne(
    trackingId: string,
    requestingUser?: RequestingUser,
  ): Promise<ZoneEntity> {
    const zone = await this.findZoneRecordOrThrow(trackingId);
    if (requestingUser) {
      await this.assertCanAccessZone(zone.id, requestingUser);
    }

    const result: any[] = await this.prisma.$queryRaw`
      SELECT
        z."trackingId",
        z.name,
        z.city,
        z."isActive",
        z."createdAt",
        z."updatedAt",
        ST_AsGeoJSON(z."polygonPostgis")::json as geojson,
        COALESCE(
          json_agg(
            json_build_object(
              'trackingId', c."trackingId",
              'companyName', c."companyName"
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as collectors
      FROM "Zone" z
      LEFT JOIN "CollectorZone" cz ON z.id = cz."zoneId"
      LEFT JOIN "Collector" c ON c.id = cz."collectorId"
      WHERE z."trackingId" = ${trackingId}
      GROUP BY z.id;
    `;
    return new ZoneEntity(result[0]);
  }

  async update(
    trackingId: string,
    dto: UpdateZoneDto,
    requestingUser: RequestingUser,
  ): Promise<ZoneEntity> {
    const zone = await this.findZoneRecordOrThrow(trackingId);
    await this.assertCanAccessZone(zone.id, requestingUser);

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
          isActive: dto.isActive,
        },
      });
    }

    return this.findOne(trackingId, requestingUser);
  }

  async remove(trackingId: string): Promise<ZoneEntity> {
    await this.findOne(trackingId);
    await this.prisma.zone.update({
      where: { trackingId },
      data: { isActive: false },
    });
    return this.findOne(trackingId);
  }

  async assignCollectors(
    zoneTrackingId: string,
    collectorTrackingIds: string[],
  ) {
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId: zoneTrackingId },
    });
    if (!zone) throw new NotFoundException('Zone not found');

    const collectors = await this.prisma.collector.findMany({
      where: { trackingId: { in: collectorTrackingIds } },
    });

    if (collectors.length === 0)
      throw new NotFoundException('No valid collectors found');

    const data = collectors.map((c) => ({
      collectorId: c.id,
      zoneId: zone.id,
    }));

    // Ignore duplicates if they are already assigned (Prisma createMany with skipDuplicates)
    await this.prisma.collectorZone.createMany({
      data,
      skipDuplicates: true,
    });

    return {
      message: `${collectors.length} collecteurs assignés avec succès à la zone`,
    };
  }

  async findZonesByCollector(
    collectorTrackingId: string,
    requestingUser: RequestingUser,
  ): Promise<ZoneEntity[]> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });
    if (!collector) throw new NotFoundException('Collector not found');
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const result = await this.prisma.$queryRaw`
      SELECT
        z."trackingId",
        z.name,
        z.city,
        z."isActive",
        z."createdAt",
        z."updatedAt",
        ST_AsGeoJSON(z."polygonPostgis")::json as geojson,
        json_build_array(
          json_build_object(
            'trackingId', c."trackingId",
            'companyName', c."companyName"
          )
        ) as collectors
      FROM "Zone" z
      INNER JOIN "CollectorZone" cz ON z.id = cz."zoneId"
      INNER JOIN "Collector" c ON c.id = cz."collectorId"
      WHERE cz."collectorId" = ${collector.id}
      ORDER BY z."createdAt" DESC;
    `;
    return (result as any[]).map((zone) => new ZoneEntity(zone));
  }

  private async findZoneRecordOrThrow(trackingId: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { trackingId },
      select: { id: true },
    });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  private async assertCanAccessZone(
    zoneId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (!isCollectorRole(requestingUser.role)) return;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    if (!user?.collectorId) {
      assertCollectorScope(user ?? null, BigInt(-1));
      return;
    }

    const assignment = await this.prisma.collectorZone.findUnique({
      where: {
        collectorId_zoneId: {
          collectorId: user.collectorId,
          zoneId,
        },
      },
      select: { zoneId: true },
    });
    if (!assignment) {
      assertCollectorScope(null, zoneId);
    }
  }

  private async getRequesterCollector(requestingUser: RequestingUser) {
    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: {
        collector: {
          select: { id: true, isActive: true, kycStatus: true },
        },
      },
    });
    if (!user?.collector) {
      throw new NotFoundException('Profil collecteur introuvable.');
    }
    return user.collector;
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
