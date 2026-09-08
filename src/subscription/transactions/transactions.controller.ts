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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { InitiateTransactionDto } from './dto/requests/initiate-transaction.dto';
import { ConfirmTransactionDto } from './dto/requests/confirm-transaction.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { CurrentUser } from '../../shared/security/current-user.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import type { RequestingUser } from '../../shared/security/requesting-user';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USAGER)
  initiate(
    @Body() dto: InitiateTransactionDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.transactionsService.initiate(dto, user.trackingId);
  }

  @Patch(':trackingId/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  confirm(
    @Param('trackingId') trackingId: string,
    @Body() dto: ConfirmTransactionDto,
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
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.SUPPORT_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findAllBySubscription(
    @Param('subscriptionTrackingId') subscriptionTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.transactionsService.findAllBySubscription(
      subscriptionTrackingId,
      pageOptionsDto,
      user,
    );
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN_SAAS,
    Role.GESTIONNAIRE_SAAS,
    Role.SUPPORT_SAAS,
    Role.ADMIN_COLLECTEUR,
    Role.AGENT_COLLECTEUR,
    Role.USAGER,
  )
  findOne(
    @Param('trackingId') trackingId: string,
    @CurrentUser() user: RequestingUser,
  ) {
    return this.transactionsService.findOne(trackingId, user);
  }
}
