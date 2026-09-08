import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SduiService } from './sdui.service';
import { CreateSduiDto } from './dto/requests/create-sdui.dto';
import { UpdateSduiDto } from './dto/requests/update-sdui.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { Roles } from '../shared/security/roles.decorator';
import { RolesGuard } from '../shared/security/roles.guard';

@Controller('sdui')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.SUPPORT_SAAS)
export class SduiController {
  constructor(private readonly sduiService: SduiService) {}

  @Post()
  create(@Body() createSduiDto: CreateSduiDto) {
    return this.sduiService.create(createSduiDto);
  }

  @Get()
  findAll() {
    return this.sduiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sduiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSduiDto: UpdateSduiDto) {
    return this.sduiService.update(+id, updateSduiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sduiService.remove(+id);
  }
}
