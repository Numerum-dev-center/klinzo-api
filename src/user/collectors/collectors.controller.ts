import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, Query } from '@nestjs/common';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/request/create-collector.dto';
import { UpdateCollectorDto } from './dto/request/update-collector.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';

@Controller('collectors')
@UseInterceptors(ClassSerializerInterceptor)
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  create(@Body() createCollectorDto: CreateCollectorDto) {
    return this.collectorsService.create(createCollectorDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.collectorsService.findAll(pageOptionsDto);
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
  getTypes() {
    return this.collectorsService.getCollectorTypes();
  }

  @Get('kyc-statuses')
  @UseGuards(JwtAuthGuard)
  getKycStatuses() {
    return this.collectorsService.getKycStatuses();
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
