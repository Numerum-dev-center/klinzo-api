import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/users/user.module';
import { CatalogModule } from './catalog/catalog.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { OperationModule } from './operation/operation.module';
import { FinancialDocumentsModule } from './finance/financial-documents/financial-documents.module';
import { YeriaModule } from './yeria/yeria.module';
import { HealthController } from './health/health.controller';
import { PlatformSettingsController } from './platform-settings/platform-settings.controller';
import { ReportingModule } from './reporting/reporting.module';
import { CommunicationModule } from './communication/communication.module';
import { ReconciliationModule } from './finance/reconciliation/reconciliation.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    UserModule,
    CatalogModule,
    SubscriptionModule,
    OperationModule,
    FinancialDocumentsModule,
    YeriaModule,
    ReportingModule,
    CommunicationModule,
    ReconciliationModule,
  ],
  controllers: [HealthController, PlatformSettingsController],
  providers: [], // Vide, car on a supprimé app.service.ts
})
export class AppModule {}
