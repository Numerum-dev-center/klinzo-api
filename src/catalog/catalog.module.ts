import { Module } from '@nestjs/common';
import { ZoneModule } from './zone/zone.module';
import { OffreModule } from './offre/offre.module';
import { VehiculeModule } from './vehicule/vehicule.module';

@Module({
  imports: [ZoneModule, OffreModule, VehiculeModule],
})
export class CatalogModule {}
