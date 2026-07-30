import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/requests/create-rating.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  create(@Body() createRatingDto: CreateRatingDto, @Req() req: any) {
    // req.user.trackingId holds the trackingId of the user from the JWT payload
    return this.ratingService.create(createRatingDto, req.user.trackingId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.ratingService.findAll(pageOptionsDto);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard)
  findAllByCollector(
    @Param('collectorTrackingId') collectorTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto
  ) {
    return this.ratingService.findAllByCollector(collectorTrackingId, pageOptionsDto);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('trackingId') trackingId: string) {
    return this.ratingService.findOne(trackingId);
  }
}
