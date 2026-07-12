import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VehiculeService } from './vehicule.service';
import { CreateVehiculeDto } from './dto/request/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/request/update-vehicule.dto';

@Controller('vehicule')
export class VehiculeController {
  constructor(private readonly vehiculeService: VehiculeService) {}

  @Post()
  create(@Body() createVehiculeDto: CreateVehiculeDto) {
    return this.vehiculeService.create(createVehiculeDto);
  }

  @Get()
  findAll() {
    return this.vehiculeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiculeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehiculeDto: UpdateVehiculeDto) {
    return this.vehiculeService.update(+id, updateVehiculeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiculeService.remove(+id);
  }
}
