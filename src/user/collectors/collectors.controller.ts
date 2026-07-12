import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/request/create-collector.dto';
import { UpdateCollectorDto } from './dto/request/update-collector.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { SearchCollectorDto } from './dto/request/search-collector.dto';
import { KycStatusFilterDto } from './dto/request/kyc-status-filter.dto';
import { TypeFilterDto } from './dto/request/type-filter.dto';

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
  @UseGuards(JwtAuthGuard)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.findAll(pageOptionsDto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@Query() searchDto: SearchCollectorDto) {
    return this.collectorsService.search(searchDto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  findActive(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.getActiveCollectors(pageOptionsDto);
  }

  @Get('inactive')
  @UseGuards(JwtAuthGuard)
  findInactive(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.getInactiveCollectors(pageOptionsDto);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard)
  getTypes(@Query() typeDto: TypeFilterDto) {
    return this.collectorsService.findByType(typeDto);
  }

  @Get('kyc-statuses')
  @UseGuards(JwtAuthGuard)
  getKycStatuses(@Query() kycDto: KycStatusFilterDto) {
    return this.collectorsService.findByKycStatus(kycDto);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('trackingId') trackingId: string) {
    return this.collectorsService.findOne(trackingId);
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  update(@Param('trackingId') trackingId: string, @Body() updateCollectorDto: UpdateCollectorDto) {
    return this.collectorsService.update(trackingId, updateCollectorDto);
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  remove(@Param('trackingId') trackingId: string) {
    return this.collectorsService.remove(trackingId);
  }
}
