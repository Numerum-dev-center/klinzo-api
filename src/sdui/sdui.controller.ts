import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SduiService } from './sdui.service';
import { CreateSduiDto } from './dto/create-sdui.dto';
import { UpdateSduiDto } from './dto/update-sdui.dto';

@Controller('sdui')
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
