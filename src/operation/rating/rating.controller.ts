import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/requests/create-rating.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  create(
    @Body() createRatingDto: CreateRatingDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.ratingService.create(createRatingDto, user.trackingId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.ratingService.findAll(pageOptionsDto);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.SUPPORT_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
  )
  findAllByCollector(
    @Param('collectorTrackingId') collectorTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.ratingService.findAllByCollector(
      collectorTrackingId,
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
    return this.ratingService.findOne(trackingId, user);
  }
}
