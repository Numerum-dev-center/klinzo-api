import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/requests/create-collector.dto';
import { UpdateCollectorDto } from './dto/requests/update-collector.dto';
import { KycDocumentDto } from './dto/requests/kyc-document.dto';
import { KycDecisionDto } from './dto/requests/kyc-decision.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
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
  create(@Body() dto: CreateCollectorDto) {
    return this.collectorsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll(@Query() dto: PageOptionsDto) {
    return this.collectorsService.findAll(dto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  search(@Query() dto: SearchCollectorDto) {
    return this.collectorsService.search(dto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.USAGER)
  findActive(@Query() dto: PageOptionsDto) {
    return this.collectorsService.getActiveCollectors(dto);
  }

  @Get('inactive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findInactive(@Query() dto: PageOptionsDto) {
    return this.collectorsService.getInactiveCollectors(dto);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  getTypes(@Query() dto: TypeFilterDto) {
    return this.collectorsService.findByType(dto);
  }

  @Get('kyc-statuses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  getKycStatuses(@Query() dto: KycStatusFilterDto) {
    return this.collectorsService.findByKycStatus(dto);
  }

  @Get(':trackingId/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  getKycDossier(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.getKycDossier(trackingId, user);
  }

  @Post(':trackingId/kyc/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_COLLECTEUR)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  addKycDocument(
    @Param('trackingId') trackingId: string,
    @Body() dto: KycDocumentDto,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.addKycDocument(
      trackingId,
      dto.type,
      file,
      user,
    );
  }

  @Get(':trackingId/kyc/documents/:documentTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  async downloadKycDocument(
    @Param('trackingId') trackingId: string,
    @Param('documentTrackingId') documentTrackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    const document = await this.collectorsService.getKycDocument(
      trackingId,
      documentTrackingId,
      user,
    );
    const safeName = document.fileName.replace(/["\r\n]/g, '_');
    return new StreamableFile(document.content, {
      type: document.mimeType,
      disposition: `attachment; filename="${safeName}"`,
      length: document.size,
    });
  }

  @Post(':trackingId/kyc/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  decideKyc(
    @Param('trackingId') trackingId: string,
    @Body() dto: KycDecisionDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.decideKyc(
      trackingId,
      dto.status,
      dto.reason,
      user.trackingId,
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.GESTIONNAIRE_SAAS,
    Role.USAGER,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.findOne(trackingId, user);
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.ADMIN_COLLECTEUR, Role.GESTIONNAIRE_SAAS)
  update(
    @Param('trackingId') trackingId: string,
    @Body() dto: UpdateCollectorDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.collectorsService.update(trackingId, dto, user);
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
