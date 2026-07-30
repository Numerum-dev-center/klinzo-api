import { Module } from '@nestjs/common';
import { TourModule } from './tour/tour.module';
import { RatingModule } from './rating/rating.module';
import { CollectionEventModule } from './collection-event/collection-event.module';

@Module({
  imports: [TourModule, RatingModule, CollectionEventModule],
})
export class OperationModule {}
