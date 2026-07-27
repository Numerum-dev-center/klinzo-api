import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionRequest } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../shared/security/roles.guard';
import { Roles } from '../shared/security/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER, Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  create(@Body() createSubscriptionDto: CreateSubscriptionRequest) {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_COLLECTEUR, Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_COLLECTEUR, Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findStatusSubscription(@Param('status') status: string) {
    return this.subscriptionService.findStatusSubscription(status);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_COLLECTEUR, Role.USAGER, Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findOne(@Param('trackingId') trackingId: string) {
    return this.subscriptionService.findOne(trackingId);
  }
}
