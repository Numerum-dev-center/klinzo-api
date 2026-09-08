import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/requests/create-tour.dto';
import { OptimizeRouteDto } from './dto/requests/optimize-route.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Tours')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  create(
    @Body() createTourDto: CreateTourDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.create(createTourDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.tourService.findAll(pageOptionsDto);
  }

  @Get('vehicle/:vehicleTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
  )
  findAllByVehicle(
    @Param('vehicleTrackingId') vehicleTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.findAllByVehicle(
      vehicleTrackingId,
      pageOptionsDto,
      user,
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.findOne(trackingId, user);
  }

  @Patch(':trackingId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT_COLLECTEUR, Role.ADMIN_COLLECTEUR)
  start(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.start(trackingId, user);
  }

  @Patch(':trackingId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT_COLLECTEUR, Role.ADMIN_COLLECTEUR)
  complete(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.complete(trackingId, user);
  }

  @Patch(':trackingId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  cancel(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.cancel(trackingId, user);
  }

  @Post('optimize-route')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  optimizeRoute(
    @Body() dto: OptimizeRouteDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.tourService.optimizeRoute(dto, user);
  }
}
