import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../shared/security/roles.decorator';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../shared/security/roles.guard';

@ApiTags('Platform Settings')
@ApiBearerAuth()
@Controller('platform-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformSettingsController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll() {
    return {
      platformCommissionRate: this.getNumberConfig(
        'PLATFORM_COMMISSION_RATE',
        0.15,
      ),
      collectionAutoValidationHours: this.getNumberConfig(
        'COLLECTION_AUTO_VALIDATION_HOURS',
        48,
      ),
      collectorInvoiceDueDays: this.getNumberConfig(
        'COLLECTOR_INVOICE_DUE_DAYS',
        15,
      ),
    };
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
