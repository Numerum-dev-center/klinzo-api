import { Injectable } from '@nestjs/common';
import { CreateSduiDto } from './dto/requests/create-sdui.dto';
import { UpdateSduiDto } from './dto/requests/update-sdui.dto';

@Injectable()
export class SduiService {
  create(_createSduiDto: CreateSduiDto) {
    return 'This action adds a new sdui';
  }

  findAll() {
    return `This action returns all sdui`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sdui`;
  }

  update(id: number, _updateSduiDto: UpdateSduiDto) {
    return `This action updates a #${id} sdui`;
  }

  remove(id: number) {
    return `This action removes a #${id} sdui`;
  }
}
