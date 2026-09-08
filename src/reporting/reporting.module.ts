import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [SharedModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
