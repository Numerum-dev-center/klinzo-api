import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { InitiateTransactionDto } from './dto/requests/initiate-transaction.dto';
import { ConfirmTransactionDto } from './dto/requests/confirm-transaction.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  initiate(@Body() dto: InitiateTransactionDto, @Req() req: any) {
    // Systematic check to use req.user.trackingId instead of req.user.id
    return this.transactionsService.initiate(dto, req.user.trackingId);
  }

  @Patch(':trackingId/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  confirm(
    @Param('trackingId') trackingId: string,
    @Body() dto: ConfirmTransactionDto
  ) {
    return this.transactionsService.confirm(trackingId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.transactionsService.findAll(pageOptionsDto);
  }

  @Get('subscription/:subscriptionTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS, Role.USAGER)
  findAllBySubscription(
    @Param('subscriptionTrackingId') subscriptionTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto
  ) {
    return this.transactionsService.findAllBySubscription(subscriptionTrackingId, pageOptionsDto);
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS, Role.USAGER)
  findOne(@Param('trackingId') trackingId: string) {
    return this.transactionsService.findOne(trackingId);
  }
}
