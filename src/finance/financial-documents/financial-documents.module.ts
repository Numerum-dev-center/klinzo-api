import { Module } from '@nestjs/common';
import { FinancialDocumentsService } from './financial-documents.service';
import { FinancialDocumentsController } from './financial-documents.controller';
import { PayoutCalculationService } from '../payout-calculation.service';
import { CollectorBillingService } from '../collector-billing.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [FinancialDocumentsController],
  providers: [
    FinancialDocumentsService,
    PayoutCalculationService,
    CollectorBillingService,
  ],
  exports: [FinancialDocumentsService],
})
export class FinancialDocumentsModule {}
