import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionEventService } from './collection-event.service';
import { CreateCollectionEventDto } from './dto/requests/create-collection-event.dto';
import { DisputeCollectionEventDto } from './dto/requests/dispute-collection-event.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@ApiTags('Collection Events')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('collection-events')
export class CollectionEventController {
  constructor(private readonly collectionEventService: CollectionEventService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT_COLLECTEUR)
  create(@Body() createCollectionEventDto: CreateCollectionEventDto) {
    return this.collectionEventService.create(createCollectionEventDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectionEventService.findAll(pageOptionsDto);
  }

  @Get('tour/:tourTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR, Role.AGENT_COLLECTEUR)
  findAllByTour(
    @Param('tourTrackingId') tourTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto
  ) {
    return this.collectionEventService.findAllByTour(tourTrackingId, pageOptionsDto);
  }

  @Get('subscription/:subscriptionTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.USAGER)
  findAllBySubscription(
    @Param('subscriptionTrackingId') subscriptionTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto
  ) {
    return this.collectionEventService.findAllBySubscription(subscriptionTrackingId, pageOptionsDto);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS, Role.USAGER)
  findOne(@Param('trackingId') trackingId: string) {
    return this.collectionEventService.findOne(trackingId);
  }

  @Patch(':trackingId/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  validate(@Param('trackingId') trackingId: string, @Req() req: any) {
    return this.collectionEventService.validate(trackingId, req.user.trackingId);
  }

  @Patch(':trackingId/dispute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  dispute(
    @Param('trackingId') trackingId: string,
    @Body() dto: DisputeCollectionEventDto,
    @Req() req: any
  ) {
    return this.collectionEventService.dispute(trackingId, req.user.trackingId, dto);
  }
}
