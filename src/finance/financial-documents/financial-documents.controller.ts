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
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FinancialDocumentsService } from './financial-documents.service';
import { PayoutCalculationService } from '../payout-calculation.service';
import { CollectorBillingService } from '../collector-billing.service';
import { GeneratePayoutDto } from './dto/requests/generate-payout.dto';
import { GenerateCollectorSubscriptionInvoiceDto } from './dto/requests/generate-collector-subscription-invoice.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role, FinancialDocumentType } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Financial Documents')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('financial-documents')
export class FinancialDocumentsController {
  constructor(
    private readonly financialDocumentsService: FinancialDocumentsService,
    private readonly payoutCalculationService: PayoutCalculationService,
    private readonly collectorBillingService: CollectorBillingService,
  ) {}

  @Post('payouts/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  generatePayout(@Body() dto: GeneratePayoutDto) {
    return this.payoutCalculationService.generatePayout(dto);
  }

  @Post('collector-subscriptions/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  generateCollectorSubscriptionInvoice(
    @Body() dto: GenerateCollectorSubscriptionInvoiceDto,
  ) {
    return this.collectorBillingService.generateSubscriptionInvoice(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  @ApiQuery({ name: 'type', enum: FinancialDocumentType, required: false })
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('type') type?: FinancialDocumentType,
  ) {
    return this.financialDocumentsService.findAll(pageOptionsDto, type);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
  )
  findAllByCollector(
    @Param('collectorTrackingId') collectorTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.financialDocumentsService.findAllByCollector(
      collectorTrackingId,
      pageOptionsDto,
      { trackingId: user.trackingId, role: user.role },
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.financialDocumentsService.findOne(trackingId, {
      trackingId: user.trackingId,
      role: user.role,
    });
  }

  @Patch(':trackingId/mark-paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  markAsPaid(@Param('trackingId') trackingId: string) {
    return this.financialDocumentsService.markAsPaid(trackingId);
  }
}
