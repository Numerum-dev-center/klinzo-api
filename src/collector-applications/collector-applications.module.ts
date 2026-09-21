import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CollectorApplicationsController } from './collector-applications.controller';
import { CollectorApplicationsService } from './collector-applications.service';

@Module({
  imports: [SharedModule],
  controllers: [CollectorApplicationsController],
  providers: [CollectorApplicationsService],
})
export class CollectorApplicationsModule {}
