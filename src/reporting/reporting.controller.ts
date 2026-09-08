import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../shared/security/roles.decorator';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../shared/security/roles.guard';
import { ReportingService } from './reporting.service';

const REPORTING_ROLES = [
  Role.SUPER_ADMIN_SAAS,
  Role.GESTIONNAIRE_SAAS,
  Role.SUPPORT_SAAS,
];

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('overview')
  @Roles(...REPORTING_ROLES)
  getOverview() {
    return this.reportingService.getOverview();
  }

  @Get('exports/overview.csv')
  @Roles(...REPORTING_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="klinzo-reporting-overview.csv"',
  )
  exportOverviewCsv() {
    return this.reportingService.exportOverviewCsv();
  }
}
