import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../shared/pagination/dto/requests/page-options.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { Roles } from '../shared/security/roles.decorator';
import { RolesGuard } from '../shared/security/roles.guard';
import { CommunicationService } from './communication.service';
import { CreateCommunicationCampaignDto } from './dto/requests/create-communication-campaign.dto';
import { CreateMessageTemplateDto } from './dto/requests/create-message-template.dto';

@ApiTags('Communication')
@ApiBearerAuth()
@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('templates')
  createTemplate(@Body() dto: CreateMessageTemplateDto) {
    return this.communicationService.createTemplate(dto);
  }

  @Get('templates')
  findTemplates(@Query() pageOptionsDto: PageOptionsDto) {
    return this.communicationService.findTemplates(pageOptionsDto);
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCommunicationCampaignDto) {
    return this.communicationService.createCampaign(dto);
  }

  @Get('campaigns')
  findCampaigns(@Query() pageOptionsDto: PageOptionsDto) {
    return this.communicationService.findCampaigns(pageOptionsDto);
  }

  @Patch('campaigns/:trackingId/sent')
  markSent(@Param('trackingId') trackingId: string) {
    return this.communicationService.markSent(trackingId);
  }

  @Patch('campaigns/:trackingId/cancel')
  cancelCampaign(@Param('trackingId') trackingId: string) {
    return this.communicationService.cancelCampaign(trackingId);
  }
}
