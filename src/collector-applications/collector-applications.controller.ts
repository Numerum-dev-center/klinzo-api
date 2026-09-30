import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../shared/pagination/dto/requests/page-options.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RateLimit } from '../shared/security/rate-limit.decorator';
import { RateLimitGuard } from '../shared/security/rate-limit.guard';
import { Roles } from '../shared/security/roles.decorator';
import { RolesGuard } from '../shared/security/roles.guard';
import { ActivateCollectorAccountDto } from './dto/activate-collector-account.dto';
import { CreateCollectorApplicationDto } from './dto/create-collector-application.dto';
import { RejectCollectorApplicationDto } from './dto/reject-collector-application.dto';
import { UpdateCollectorApplicationEmailDto } from './dto/update-collector-application-email.dto';
import { CollectorApplicationsService } from './collector-applications.service';

@Controller('collector-applications')
export class CollectorApplicationsController {
  constructor(private readonly applications: CollectorApplicationsService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60_000 })
  create(@Body() dto: CreateCollectorApplicationDto) {
    return this.applications.create(dto);
  }

  @Post('activate')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60_000 })
  activate(@Body() dto: ActivateCollectorAccountDto) {
    return this.applications.activate(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll(@Query() page: PageOptionsDto) {
    return this.applications.findAll(page);
  }

  @Patch(':trackingId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  approve(@Param('trackingId') trackingId: string) {
    return this.applications.approve(trackingId);
  }

  @Patch(':trackingId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  reject(
    @Param('trackingId') trackingId: string,
    @Body() dto: RejectCollectorApplicationDto,
  ) {
    return this.applications.reject(trackingId, dto.reason);
  }

  @Patch(':trackingId/email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  updateEmail(
    @Param('trackingId') trackingId: string,
    @Body() dto: UpdateCollectorApplicationEmailDto,
  ) {
    return this.applications.updateEmail(trackingId, dto.email);
  }

  @Post(':trackingId/resend-invitation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  resendInvitation(@Param('trackingId') trackingId: string) {
    return this.applications.resendInvitation(trackingId);
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  remove(@Param('trackingId') trackingId: string) {
    return this.applications.remove(trackingId);
  }
}
