import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/requests/create-collector.dto';
import { UpdateCollectorDto } from './dto/requests/update-collector.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { SearchCollectorDto } from './dto/requests/search-collector.dto';
import { KycStatusFilterDto } from './dto/requests/kyc-status-filter.dto';
import { TypeFilterDto } from './dto/requests/type-filter.dto';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Collectors')
@ApiBearerAuth()
@Controller('collectors')
@UseInterceptors(ClassSerializerInterceptor)
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  create(@Body() createCollectorDto: CreateCollectorDto) {
    return this.collectorsService.create(createCollectorDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.findAll(pageOptionsDto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  search(@Query() searchDto: SearchCollectorDto) {
    return this.collectorsService.search(searchDto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.USAGER)
  findActive(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.getActiveCollectors(pageOptionsDto);
  }

  @Get('inactive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findInactive(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.getInactiveCollectors(pageOptionsDto);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  getTypes(@Query() typeDto: TypeFilterDto) {
    return this.collectorsService.findByType(typeDto);
  }

  @Get('kyc-statuses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  getKycStatuses(@Query() kycDto: KycStatusFilterDto) {
    return this.collectorsService.findByKycStatus(kycDto);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.findOne(trackingId, {
      trackingId: user.trackingId,
      role: user.role,
    });
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  update(
    @Param('trackingId') trackingId: string,
    @Body() updateCollectorDto: UpdateCollectorDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.update(trackingId, updateCollectorDto, {
      trackingId: user.trackingId,
      role: user.role,
    });
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  remove(@Param('trackingId') trackingId: string) {
    return this.collectorsService.remove(trackingId);
  }

  @Patch(':trackingId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  suspend(@Param('trackingId') trackingId: string) {
    return this.collectorsService.suspend(trackingId);
  }

  @Patch(':trackingId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  reactivate(@Param('trackingId') trackingId: string) {
    return this.collectorsService.reactivate(trackingId);
  }
}
