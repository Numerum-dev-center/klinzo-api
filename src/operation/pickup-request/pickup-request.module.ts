import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PickupRequestController } from './pickup-request.controller';
import { PickupRequestService } from './pickup-request.service';

@Module({
  imports: [SharedModule],
  controllers: [PickupRequestController],
  providers: [PickupRequestService],
})
export class PickupRequestModule {}
