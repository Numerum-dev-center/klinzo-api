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
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Query } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';

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
    @Query() pagination: PaginationQueryDto,
    ) {

    return this.subscriptionsService.findAll(
        pagination.page ?? 1,
        pagination.limit ?? 10,
    );

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
}