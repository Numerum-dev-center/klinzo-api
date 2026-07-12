import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CollectionEvenService } from './collection-even.service';
import { CreateCollectionEvenDto } from './dto/request/create-collection-even.dto';
import { UpdateCollectionEvenDto } from './dto/request/update-collection-even.dto';

@Controller('collection-even')
export class CollectionEvenController {
  constructor(private readonly collectionEvenService: CollectionEvenService) {}

  @Post()
  create(@Body() createCollectionEvenDto: CreateCollectionEvenDto) {
    return this.collectionEvenService.create(createCollectionEvenDto);
  }

  @Get()
  findAll() {
    return this.collectionEvenService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionEvenService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCollectionEvenDto: UpdateCollectionEvenDto) {
    return this.collectionEvenService.update(+id, updateCollectionEvenDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectionEvenService.remove(+id);
  }
}
