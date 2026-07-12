import { Injectable } from '@nestjs/common';
import { CreateOffreDto } from './dto/request/create-offre.dto';
import { UpdateOffreDto } from './dto/request/update-offre.dto';

@Injectable()
export class OffreService {
  create(createOffreDto: CreateOffreDto) {
    return 'This action adds a new offre';
  }

  findAll() {
    return `This action returns all offre`;
  }

  findOne(id: number) {
    return `This action returns a #${id} offre`;
  }

  update(id: number, updateOffreDto: UpdateOffreDto) {
    return `This action updates a #${id} offre`;
  }

  remove(id: number) {
    return `This action removes a #${id} offre`;
  }
}
