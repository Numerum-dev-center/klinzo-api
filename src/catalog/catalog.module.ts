import { Module } from '@nestjs/common';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ZonesModule } from './zones/zones.module';
import { OffersModule } from './offers/offers.module';

@Module({
  imports: [VehiclesModule, ZonesModule, OffersModule],
})
export class CatalogModule {}
