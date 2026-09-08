import { Module } from '@nestjs/common';
import { TourModule } from './tour/tour.module';
import { RatingModule } from './rating/rating.module';
import { CollectionEventModule } from './collection-event/collection-event.module';
import { PickupRequestModule } from './pickup-request/pickup-request.module';

@Module({
  imports: [
    TourModule,
    RatingModule,
    CollectionEventModule,
    PickupRequestModule,
  ],
})
export class OperationModule {}
