import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/users/user.module';
import { CatalogModule } from './catalog/catalog.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { OperationModule } from './operation/operation.module';
import { FinancialDocumentsModule } from './finance/financial-documents/financial-documents.module';
import { SduiModule } from './sdui/sdui.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    UserModule,
    CatalogModule,
    SubscriptionModule,
    OperationModule,
    FinancialDocumentsModule,
    SduiModule,
  ],
  controllers: [], // Vide, car on a supprimé app.controller.ts
  providers: [], // Vide, car on a supprimé app.service.ts
})
export class AppModule {}