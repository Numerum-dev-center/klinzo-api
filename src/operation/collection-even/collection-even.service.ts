import { Injectable } from '@nestjs/common';
import { CreateCollectionEvenDto } from './dto/request/create-collection-even.dto';
import { UpdateCollectionEvenDto } from './dto/request/update-collection-even.dto';

@Injectable()
export class CollectionEvenService {
  create(createCollectionEvenDto: CreateCollectionEvenDto) {
    return 'This action adds a new collectionEven';
  }

  findAll() {
    return `This action returns all collectionEven`;
  }

  findOne(id: number) {
    return `This action returns a #${id} collectionEven`;
  }

  update(id: number, updateCollectionEvenDto: UpdateCollectionEvenDto) {
    return `This action updates a #${id} collectionEven`;
  }

  remove(id: number) {
    return `This action removes a #${id} collectionEven`;
  }
}
