import { Module } from '@nestjs/common';
import { VehiculeService } from './vehicule.service';
import { VehiculeController } from './vehicule.controller';

@Module({
  controllers: [VehiculeController],
  providers: [VehiculeService],
})
export class VehiculeModule {}
