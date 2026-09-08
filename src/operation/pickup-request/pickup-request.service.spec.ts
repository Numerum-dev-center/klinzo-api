import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PickupRequestStatus, Role } from '@prisma/client';
import { PickupRequestService } from './pickup-request.service';

const prismaServiceMock = {
  user: {
    findUnique: jest.fn(),
  },
  collector: {
    findUnique: jest.fn(),
  },
  pickupRequest: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('PickupRequestService', () => {
  let service: PickupRequestService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PickupRequestService(prismaServiceMock as any);
  });

  it('creates a pickup request for the authenticated user without leaking internal IDs', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue({
      id: BigInt(10),
      trackingId: 'user-public-id',
      firstName: 'Afi',
      lastName: 'Mensah',
      email: 'afi@example.test',
      phone: '+22890000000',
    });
    prismaServiceMock.collector.findUnique.mockResolvedValue({
      id: BigInt(20),
      trackingId: 'collector-public-id',
      companyName: 'Klin Collect',
      contactPhone: '+22891111111',
      isActive: true,
    });
    prismaServiceMock.pickupRequest.create.mockResolvedValue({
      trackingId: 'request-public-id',
      createdAt: new Date('2026-09-08T10:00:00.000Z'),
      updatedAt: new Date('2026-09-08T10:00:00.000Z'),
      status: PickupRequestStatus.NEW,
      wasteType: 'Encombrants',
      addressText: 'Rue 1, Lomé',
      latitude: 6.13,
      longitude: 1.22,
      preferredDate: new Date('2026-09-09T10:00:00.000Z'),
      scheduledDate: null,
      completedAt: null,
      estimatedPrice: 2500,
      finalPrice: null,
      notes: 'Sacs devant le portail',
      cancellationReason: null,
      user: {
        trackingId: 'user-public-id',
        firstName: 'Afi',
        lastName: 'Mensah',
        email: 'afi@example.test',
        phone: '+22890000000',
        password: 'hashed-password',
      },
      collector: {
        trackingId: 'collector-public-id',
        companyName: 'Klin Collect',
        contactPhone: '+22891111111',
        id: BigInt(20),
      },
    });

    const response = await service.create(
      {
        collectorTrackingId: 'collector-public-id',
        wasteType: 'Encombrants',
        addressText: 'Rue 1, Lomé',
        latitude: 6.13,
        longitude: 1.22,
        preferredDate: '2026-09-09T10:00:00.000Z',
        estimatedPrice: 2500,
        notes: 'Sacs devant le portail',
      },
      { trackingId: 'user-public-id', role: Role.USAGER },
    );

    expect(prismaServiceMock.pickupRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: BigInt(10),
          collectorId: BigInt(20),
        }),
      }),
    );
    expect(response.trackingId).toBe('request-public-id');
    expect(response.user).toEqual({
      trackingId: 'user-public-id',
      firstName: 'Afi',
      lastName: 'Mensah',
      email: 'afi@example.test',
      phone: '+22890000000',
    });
    expect(response.user).not.toHaveProperty('password');
    expect(response.collector).not.toHaveProperty('id');
  });

  it('prevents a collector from scheduling another collector pickup request', async () => {
    prismaServiceMock.pickupRequest.findUnique.mockResolvedValue({
      trackingId: 'request-public-id',
      status: PickupRequestStatus.NEW,
      collectorId: BigInt(20),
      estimatedPrice: 2500,
      user: { trackingId: 'user-public-id' },
      collector: { trackingId: 'collector-public-id' },
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      trackingId: 'agent-public-id',
      collectorId: BigInt(99),
    });

    await expect(
      service.schedule(
        'request-public-id',
        { scheduledDate: '2026-09-09T10:00:00.000Z' },
        { trackingId: 'agent-public-id', role: Role.ADMIN_COLLECTEUR },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only completes scheduled pickup requests', async () => {
    prismaServiceMock.pickupRequest.findUnique.mockResolvedValue({
      trackingId: 'request-public-id',
      status: PickupRequestStatus.NEW,
      collectorId: BigInt(20),
      user: { trackingId: 'user-public-id' },
      collector: { trackingId: 'collector-public-id' },
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      trackingId: 'agent-public-id',
      collectorId: BigInt(20),
    });

    await expect(
      service.complete('request-public-id', {
        trackingId: 'agent-public-id',
        role: Role.ADMIN_COLLECTEUR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
