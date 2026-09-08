import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRepository } from './subscriptions.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { KycStatus, Role } from '@prisma/client';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const subscriptionRepositoryMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllByCollector: jest.fn(),
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
    collector: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

  it('rejects subscription reads for a different usager', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      trackingId: 'subscription-1',
      qrCodeId: 'QR-1',
      addressText: 'Rue 1',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      nextBillingDate: new Date('2026-02-01T00:00:00.000Z'),
      userId: BigInt(1),
      offerId: BigInt(1),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { trackingId: 'owner-user' },
      offer: { collectorId: BigInt(1) },
    });

    await expect(
      service.findOne('subscription-1', {
        trackingId: 'other-user',
        role: Role.USAGER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects collector scoped lists outside the requester collector', async () => {
    prismaServiceMock.collector.findUnique.mockResolvedValue({
      id: BigInt(1),
      trackingId: 'collector-1',
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      collectorId: BigInt(2),
    });

    await expect(
      service.findAllByCollector('collector-1', {} as any, {
        trackingId: 'collector-admin',
        role: Role.ADMIN_COLLECTEUR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      subscriptionRepositoryMock.findAllByCollector,
    ).not.toHaveBeenCalled();
  });

  it('rejects subscription creation for an inactive offer', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue({ id: BigInt(1) });
    prismaServiceMock.offer.findUnique.mockResolvedValue({
      id: BigInt(1),
      isActive: false,
      collector: { isActive: true, kycStatus: KycStatus.APPROVED },
    });

    await expect(
      service.create({
        latitude: 6.13,
        longitude: 1.22,
        addressText: 'Rue Test',
        status: 'PENDING_PAYMENT' as any,
        startDate: '2026-01-01T00:00:00.000Z',
        nextBillingDate: '2026-02-01T00:00:00.000Z',
        userTrackingId: 'user-1',
        offerTrackingId: 'offer-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subscriptionRepositoryMock.create).not.toHaveBeenCalled();
  });

  it('rejects subscription creation for a collector without approved KYC', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue({ id: BigInt(1) });
    prismaServiceMock.offer.findUnique.mockResolvedValue({
      id: BigInt(1),
      isActive: true,
      collector: { isActive: true, kycStatus: KycStatus.PENDING_REVIEW },
    });

    await expect(
      service.create({
        latitude: 6.13,
        longitude: 1.22,
        addressText: 'Rue Test',
        status: 'PENDING_PAYMENT' as any,
        startDate: '2026-01-01T00:00:00.000Z',
        nextBillingDate: '2026-02-01T00:00:00.000Z',
        userTrackingId: 'user-1',
        offerTrackingId: 'offer-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subscriptionRepositoryMock.create).not.toHaveBeenCalled();
  });
});
