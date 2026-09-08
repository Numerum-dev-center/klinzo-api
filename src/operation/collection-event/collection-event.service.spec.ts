import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CollectionEventService } from './collection-event.service';
import { CollectionEventResponse } from './dto/responses/collection-event.response';

describe('CollectionEventService', () => {
  let service: CollectionEventService;

  const prismaServiceMock = {
    subscription: {
      findUnique: jest.fn(),
    },
    collectionEvent: {
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
        CollectionEventService,
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

    service = module.get<CollectionEventService>(CollectionEventService);
  });

  it('rejects subscription collection history outside the requester collector', async () => {
    prismaServiceMock.subscription.findUnique.mockResolvedValue({
      id: BigInt(21),
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
    expect(prismaServiceMock.collectionEvent.findMany).not.toHaveBeenCalled();
  });

  it('allows subscription collection history for the owning collector', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prismaServiceMock.subscription.findUnique.mockResolvedValue({
      id: BigInt(21),
      user: { trackingId: 'user-1' },
      offer: { collectorId: BigInt(1) },
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      collectorId: BigInt(1),
    });
    prismaServiceMock.collectionEvent.count.mockResolvedValue(1);
    prismaServiceMock.collectionEvent.findMany.mockResolvedValue([
      {
        id: BigInt(99),
        trackingId: 'event-1',
        status: 'VALIDATED',
        executedAt: createdAt,
        photoUrl: null,
        qrScanData: null,
        autoValidationDeadline: createdAt,
        disputeReason: null,
        tourId: BigInt(12),
        subscriptionId: BigInt(21),
        subscription: { trackingId: 'subscription-1' },
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
    expect(result.data[0].trackingId).toBe('event-1');
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).not.toHaveProperty('tourId');
    expect(result.data[0]).not.toHaveProperty('subscriptionId');
    expect(result.data[0].subscriptionTrackingId).toBe('subscription-1');
    expect(prismaServiceMock.collectionEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscriptionId: BigInt(21) },
      }),
    );
  });

  it('exposes disputed collection context without leaking internal relation fields', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const response = new CollectionEventResponse({
      id: BigInt(99),
      trackingId: 'event-1',
      status: 'DISPUTED' as any,
      executedAt: now,
      photoUrl: null,
      qrScanData: null,
      autoValidationDeadline: now,
      disputeReason: 'Collecte non effectuee',
      tourId: BigInt(12),
      subscriptionId: BigInt(21),
      subscription: {
        trackingId: 'subscription-1',
        user: {
          id: BigInt(3),
          trackingId: 'user-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '+22890000000',
          password: 'hashed-password',
          collectorId: null,
        },
        offer: {
          id: BigInt(4),
          trackingId: 'offer-1',
          name: 'Mensuel',
          price: 5000,
          frequency: 'MENSUEL',
          collectorId: BigInt(5),
          collector: {
            id: BigInt(5),
            trackingId: 'collector-1',
            companyName: 'Klinzo Partner',
          },
        },
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    expect(response.subscriptionTrackingId).toBe('subscription-1');
    expect(response.user).toEqual({
      trackingId: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+22890000000',
    });
    expect(response.offer).toEqual({
      trackingId: 'offer-1',
      name: 'Mensuel',
      price: 5000,
      frequency: 'MENSUEL',
    });
    expect(response.collector).toEqual({
      trackingId: 'collector-1',
      companyName: 'Klinzo Partner',
    });
    expect(response.user).not.toHaveProperty('id');
    expect(response.user).not.toHaveProperty('password');
    expect(response.user).not.toHaveProperty('collectorId');
    expect(response.offer).not.toHaveProperty('id');
    expect(response.offer).not.toHaveProperty('collectorId');
    expect(response.collector).not.toHaveProperty('id');
  });
});
