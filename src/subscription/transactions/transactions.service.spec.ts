import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const prismaServiceMock = {
    subscription: {
      findUnique: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('rejects subscription transaction reads outside the requester collector', async () => {
    prismaServiceMock.subscription.findUnique.mockResolvedValue({
      id: BigInt(11),
      user: { trackingId: 'user-1' },
      offer: { collectorId: BigInt(1) },
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      collectorId: BigInt(2),
    });

    await expect(
      service.findAllBySubscription('subscription-1', {} as any, {
        trackingId: 'collector-admin',
        role: Role.ADMIN_COLLECTEUR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaServiceMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it('allows subscription transaction reads for the owning collector', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prismaServiceMock.subscription.findUnique.mockResolvedValue({
      id: BigInt(11),
      user: { trackingId: 'user-1' },
      offer: { collectorId: BigInt(1) },
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      collectorId: BigInt(1),
    });
    prismaServiceMock.transaction.count.mockResolvedValue(1);
    prismaServiceMock.transaction.findMany.mockResolvedValue([
      {
        trackingId: 'transaction-1',
        amount: 5000,
        platformCommission: 750,
        paymentGatewayRef: 'PAY-1',
        status: 'SUCCESS',
        invoicePdfUrl: null,
        timestamp: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const result = await service.findAllBySubscription(
      'subscription-1',
      { skip: 0, size: 20 },
      {
        trackingId: 'collector-admin',
        role: Role.ADMIN_COLLECTEUR,
      },
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0].trackingId).toBe('transaction-1');
    expect(prismaServiceMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscriptionId: BigInt(11) },
      }),
    );
  });
});
