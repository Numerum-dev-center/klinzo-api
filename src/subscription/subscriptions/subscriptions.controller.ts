import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/requests/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/requests/update-subscription.dto';
import { Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}


  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
  )
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }


  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
      Role.SUPER_ADMIN_SAAS,
      Role.GESTIONNAIRE_SAAS,
  )    
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.subscriptionsService.findAll(pageOptionsDto);
  }


  @Get(':trackingId')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('trackingId') trackingId: string,
  ) {
    return this.subscriptionsService.findOne(trackingId);
  }


  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
  )
  update(
    @Param('trackingId') trackingId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(
      trackingId,
      updateSubscriptionDto,
    );
  }


  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS)
  remove(
    @Param('trackingId') trackingId: string,
  ) {
    return this.subscriptionsService.remove(trackingId);
  }

  @Patch(':trackingId/regenerate-qr-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  regenerateQrCode(@Param('trackingId') trackingId: string) {
    return this.subscriptionsService.regenerateQrCode(trackingId);
  }

  @Patch(':trackingId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  suspend(@Param('trackingId') trackingId: string) {
    // TODO: Une auto-suspension par l'usager lui-même (self-service) pourrait être ajoutée en V1
    return this.subscriptionsService.suspend(trackingId);
  }

  @Patch(':trackingId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  reactivate(@Param('trackingId') trackingId: string) {
    return this.subscriptionsService.reactivate(trackingId);
  }
}