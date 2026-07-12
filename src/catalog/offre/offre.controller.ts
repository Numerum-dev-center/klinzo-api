import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OffreService } from './offre.service';
import { CreateOffreDto } from './dto/request/create-offre.dto';
import { UpdateOffreDto } from './dto/request/update-offre.dto';

@Controller('offre')
export class OffreController {
  constructor(private readonly offreService: OffreService) {}

  @Post()
  create(@Body() createOffreDto: CreateOffreDto) {
    return this.offreService.create(createOffreDto);
  }

  @Get()
  findAll() {
    return this.offreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offreService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOffreDto: UpdateOffreDto) {
    return this.offreService.update(+id, updateOffreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.offreService.remove(+id);
  }
}
