import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/requests/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/requests/update-vehicle.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.vehiclesService.create(createVehicleDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.vehiclesService.findAll(pageOptionsDto);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.GESTIONNAIRE_SAAS,
  )
  findAllByCollector(
    @Param('collectorTrackingId') collectorTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.vehiclesService.findAllByCollector(
      collectorTrackingId,
      pageOptionsDto,
      user,
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.GESTIONNAIRE_SAAS,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.vehiclesService.findOne(trackingId, user);
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  update(
    @Param('trackingId') trackingId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.vehiclesService.update(trackingId, updateVehicleDto, user);
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  remove(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.vehiclesService.remove(trackingId, user);
  }
}
