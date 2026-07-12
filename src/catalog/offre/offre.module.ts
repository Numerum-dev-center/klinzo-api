import { Module } from '@nestjs/common';
import { OffreService } from './offre.service';
import { OffreController } from './offre.controller';

@Module({
  controllers: [OffreController],
  providers: [OffreService],
})
export class OffreModule {}
