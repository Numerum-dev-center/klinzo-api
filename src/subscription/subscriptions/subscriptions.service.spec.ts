import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRepository } from './subscriptions.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const subscriptionRepositoryMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
    },
    offer: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: SubscriptionRepository,
          useValue: subscriptionRepositoryMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
