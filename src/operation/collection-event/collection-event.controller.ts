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
import { CollectionEventService } from './collection-event.service';
import { CreateCollectionEventDto } from './dto/requests/create-collection-event.dto';
import { DisputeCollectionEventDto } from './dto/requests/dispute-collection-event.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Collection Events')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('collection-events')
export class CollectionEventController {
  constructor(
    private readonly collectionEventService: CollectionEventService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT_COLLECTEUR)
  create(
    @Body() createCollectionEventDto: CreateCollectionEventDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.create(createCollectionEventDto, {
      trackingId: user.trackingId,
      role: user.role,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectionEventService.findAll(pageOptionsDto);
  }

  @Get('tour/:tourTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
  )
  findAllByTour(
    @Param('tourTrackingId') tourTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.findAllByTour(
      tourTrackingId,
      pageOptionsDto,
      user,
    );
  }

  @Get('subscription/:subscriptionTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findAllBySubscription(
    @Param('subscriptionTrackingId') subscriptionTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.findAllBySubscription(
      subscriptionTrackingId,
      pageOptionsDto,
      user,
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.SUPPORT_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.findOne(trackingId, user);
  }

  @Patch(':trackingId/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  validate(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.validate(trackingId, user.trackingId);
  }

  @Patch(':trackingId/dispute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  dispute(
    @Param('trackingId') trackingId: string,
    @Body() dto: DisputeCollectionEventDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectionEventService.dispute(
      trackingId,
      user.trackingId,
      dto,
    );
  }
}
