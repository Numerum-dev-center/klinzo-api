import { Module } from '@nestjs/common';
import { TourModule } from './tour/tour.module';
import { RatingModule } from './rating/rating.module';
import { CollectionEvenModule } from './collection-even/collection-even.module';

@Module({
  imports: [TourModule, RatingModule, CollectionEvenModule],
})
export class OperationModule {}
