import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/requests/create-zone.dto';
import { UpdateZoneDto } from './dto/requests/update-zone.dto';
import { AssignCollectorsDto } from './dto/requests/assign-collectors.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Zones')
@ApiBearerAuth()
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  findOne(@Param('trackingId') trackingId: string) {
    return this.zonesService.findOne(trackingId);
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  update(
    @Param('trackingId') trackingId: string,
    @Body() updateZoneDto: UpdateZoneDto
  ) {
    return this.zonesService.update(trackingId, updateZoneDto);
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  remove(@Param('trackingId') trackingId: string) {
    return this.zonesService.remove(trackingId);
  }

  @Post(':trackingId/assign-collectors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS) // Only SAAS should assign multiple? Or Admin Collecteur for their sub-agencies? We use both.
  assignCollectors(
    @Param('trackingId') trackingId: string,
    @Body() dto: AssignCollectorsDto
  ) {
    return this.zonesService.assignCollectors(trackingId, dto.collectorTrackingIds);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  findByCollector(@Param('collectorTrackingId') collectorTrackingId: string) {
    return this.zonesService.findZonesByCollector(collectorTrackingId);
  }
}
