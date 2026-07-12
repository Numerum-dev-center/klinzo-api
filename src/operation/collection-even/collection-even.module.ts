import { Module } from '@nestjs/common';
import { CollectionEvenService } from './collection-even.service';
import { CollectionEvenController } from './collection-even.controller';

@Module({
  controllers: [CollectionEvenController],
  providers: [CollectionEvenService],
})
export class CollectionEvenModule {}
