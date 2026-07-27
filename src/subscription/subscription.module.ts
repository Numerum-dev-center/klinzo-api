import { Module } from '@nestjs/common';
import { TransactionsModule } from './transactions/transactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [TransactionsModule, SubscriptionsModule],
})
export class SubscriptionModule {}
