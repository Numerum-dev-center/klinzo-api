import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { RolesGuard } from '../../shared/security/roles.guard';
import { CreateBankStatementLineDto } from './dto/requests/create-bank-statement-line.dto';
import { MatchBankStatementLineDto } from './dto/requests/match-bank-statement-line.dto';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('statement-lines')
  createLine(@Body() dto: CreateBankStatementLineDto) {
    return this.reconciliationService.createLine(dto);
  }

  @Get('statement-lines')
  findLines(@Query() pageOptionsDto: PageOptionsDto) {
    return this.reconciliationService.findLines(pageOptionsDto);
  }

  @Post('auto-match')
  autoMatch() {
    return this.reconciliationService.autoMatch();
  }

  @Patch('statement-lines/:trackingId/match')
  matchLine(
    @Param('trackingId') trackingId: string,
    @Body() dto: MatchBankStatementLineDto,
  ) {
    return this.reconciliationService.matchLine(trackingId, dto);
  }
}
