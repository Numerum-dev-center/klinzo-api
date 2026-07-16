import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Module({
  controllers: [
    SubscriptionsController
  ],
  
  providers: [
    SubscriptionsService,
    PrismaService,
  ]
})
export class SubscriptionsModule {}
