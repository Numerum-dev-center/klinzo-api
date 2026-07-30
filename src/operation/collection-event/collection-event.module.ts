import { Module } from '@nestjs/common';
import { CollectionEventService } from './collection-event.service';
import { CollectionEventController } from './collection-event.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [CollectionEventController],
  providers: [CollectionEventService],
})
export class CollectionEventModule {}
