import { Test, TestingModule } from '@nestjs/testing';
import {
  CollectionStatus,
  FinancialDocumentStatus,
  FinancialDocumentType,
  KycStatus,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  let service: ReportingService;

  const prismaServiceMock = {
    collector: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    zone: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    collectionEvent: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    financialDocument: {
      aggregate: jest.fn(),
    },
    rating: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  it('calculates core rates and finance aggregates', async () => {
    const now = new Date();

    prismaServiceMock.collector.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prismaServiceMock.collector.groupBy.mockResolvedValue([
      { kycStatus: KycStatus.APPROVED, _count: { _all: 2 } },
      { kycStatus: KycStatus.PENDING_REVIEW, _count: { _all: 1 } },
    ]);
    prismaServiceMock.user.count
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);
    prismaServiceMock.user.groupBy.mockResolvedValue([
      { role: Role.USAGER, _count: { _all: 4 } },
      { role: Role.SUPER_ADMIN_SAAS, _count: { _all: 1 } },
    ]);
    prismaServiceMock.zone.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    prismaServiceMock.zone.groupBy.mockResolvedValue([
      { city: 'Lomé', _count: { _all: 3 } },
      { city: 'Kara', _count: { _all: 2 } },
    ]);
    prismaServiceMock.subscription.count.mockResolvedValue(10);
    prismaServiceMock.subscription.groupBy.mockResolvedValue([
      { status: SubscriptionStatus.ACTIVE, _count: { _all: 7 } },
      { status: SubscriptionStatus.PENDING_PAYMENT, _count: { _all: 3 } },
    ]);
    prismaServiceMock.collectionEvent.count.mockResolvedValue(4);
    prismaServiceMock.collectionEvent.groupBy.mockResolvedValue([
      { status: CollectionStatus.VALIDATED, _count: { _all: 2 } },
      { status: CollectionStatus.DISPUTED, _count: { _all: 1 } },
      { status: CollectionStatus.PENDING, _count: { _all: 1 } },
    ]);
    prismaServiceMock.transaction.count.mockResolvedValue(5);
    prismaServiceMock.transaction.groupBy.mockResolvedValue([
      { status: 'SUCCESS', _count: { _all: 3 } },
      { status: 'FAILED', _count: { _all: 2 } },
    ]);
    prismaServiceMock.transaction.aggregate
      .mockResolvedValueOnce({
        _count: 3,
        _sum: { amount: 1000, platformCommission: 150 },
      })
      .mockResolvedValueOnce({
        _sum: { amount: 1200, platformCommission: 180 },
      });
    prismaServiceMock.financialDocument.aggregate.mockImplementation(
      ({ where }) =>
        Promise.resolve({
          _sum: {
            amount:
              where.type === FinancialDocumentType.PAYOUT &&
              where.status === FinancialDocumentStatus.PENDING
                ? 250
                : 500,
          },
        }),
    );
    prismaServiceMock.rating.aggregate.mockResolvedValue({
      _avg: { score: 4.25 },
      _count: 8,
    });
    prismaServiceMock.subscription.findMany.mockResolvedValue([
      { createdAt: now },
    ]);
    prismaServiceMock.collectionEvent.findMany.mockResolvedValue([
      { createdAt: now, status: CollectionStatus.VALIDATED },
      { createdAt: now, status: CollectionStatus.PENDING },
    ]);
    prismaServiceMock.transaction.findMany.mockResolvedValue([
      {
        createdAt: now,
        status: 'SUCCESS',
        amount: 1000,
        platformCommission: 150,
      },
    ]);

    const overview = await service.getOverview();

    expect(overview.collectors.active).toBe(2);
    expect(overview.users.usagers).toBe(4);
    expect(overview.collections.validationRate).toBe(50);
    expect(overview.collections.disputeRate).toBe(25);
    expect(overview.finance.transactions.recoveryRate).toBe(60);
    expect(overview.finance.revenue).toBe(1000);
    expect(overview.geography.coverageRate).toBe(75);
    expect(overview.quality.averageRating).toBe(4.3);
    expect(overview.monthlyActivity).toHaveLength(6);
  });
});
