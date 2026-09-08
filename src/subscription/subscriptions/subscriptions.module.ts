import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SubscriptionRepository } from './subscriptions.repository';

@Module({
  controllers: [SubscriptionsController],

  providers: [PrismaService, SubscriptionsService, SubscriptionRepository],
})
export class SubscriptionsModule {}
