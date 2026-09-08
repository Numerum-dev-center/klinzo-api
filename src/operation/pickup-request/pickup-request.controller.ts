import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { Roles } from '../../shared/security/roles.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import type { RequestingUser } from '../../shared/security/requesting-user';
import { CreatePickupRequestDto } from './dto/requests/create-pickup-request.dto';
import { SchedulePickupRequestDto } from './dto/requests/schedule-pickup-request.dto';
import { CancelPickupRequestDto } from './dto/requests/cancel-pickup-request.dto';
import { PickupRequestService } from './pickup-request.service';

@ApiTags('Pickup requests')
@ApiBearerAuth()
@Controller('pickup-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PickupRequestController {
  constructor(private readonly pickupRequestService: PickupRequestService) {}

  @Post()
  @Roles(Role.USAGER)
  create(
    @Body() dto: CreatePickupRequestDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.create(dto, user);
  }

  @Get()
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.findAll(pageOptionsDto, user);
  }

  @Get(':trackingId')
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.findOne(trackingId, user);
  }

  @Patch(':trackingId/schedule')
  @Roles(Role.ADMIN_COLLECTEUR)
  schedule(
    @Param('trackingId') trackingId: string,
    @Body() dto: SchedulePickupRequestDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.schedule(trackingId, dto, user);
  }

  @Patch(':trackingId/complete')
  @Roles(Role.ADMIN_COLLECTEUR)
  complete(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.complete(trackingId, user);
  }

  @Patch(':trackingId/cancel')
  @Roles(Role.ADMIN_COLLECTEUR, Role.USAGER)
  cancel(
    @Param('trackingId') trackingId: string,
    @Body() dto: CancelPickupRequestDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.pickupRequestService.cancel(trackingId, dto, user);
  }
}
