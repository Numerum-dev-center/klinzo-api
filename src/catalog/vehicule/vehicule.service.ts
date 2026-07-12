import { Injectable } from '@nestjs/common';
import { CreateVehiculeDto } from './dto/request/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/request/update-vehicule.dto';

@Injectable()
export class VehiculeService {
  create(createVehiculeDto: CreateVehiculeDto) {
    return 'This action adds a new vehicule';
  }

  findAll() {
    return `This action returns all vehicule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vehicule`;
  }

  update(id: number, updateVehiculeDto: UpdateVehiculeDto) {
    return `This action updates a #${id} vehicule`;
  }

  remove(id: number) {
    return `This action removes a #${id} vehicule`;
  }
}
