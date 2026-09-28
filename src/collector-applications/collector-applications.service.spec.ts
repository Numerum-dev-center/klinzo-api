import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectorApplicationStatus } from '@prisma/client';
import { CollectorApplicationsService } from './collector-applications.service';
import { PrismaService } from '../shared/prisma/prisma.service';

describe('CollectorApplicationsService email correction', () => {
  const prismaMock: any = {
    collectorApplication: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: { findUnique: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    collector: {
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const configMock = { get: jest.fn() };
  let service: CollectorApplicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(prismaMock),
    );
    service = new CollectorApplicationsService(
      prismaMock as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  it('updates only the candidature before approval', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      contactEmail: 'wrong@example.com',
      status: CollectorApplicationStatus.PENDING,
      activatedAt: null,
      userTrackingId: null,
      collectorTrackingId: null,
    });
    prismaMock.collectorApplication.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.collector.findFirst.mockResolvedValue(null);

    const result = await service.updateEmail(
      'application-1',
      ' Correct@Example.com ',
    );

    expect(prismaMock.collectorApplication.update).toHaveBeenCalledWith({
      where: { trackingId: 'application-1' },
      data: { contactEmail: 'correct@example.com' },
    });
    expect(result.contactEmail).toBe('correct@example.com');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('synchronizes approved account data and replaces the invitation', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      contactEmail: 'wrong@example.com',
      status: CollectorApplicationStatus.APPROVED,
      activatedAt: null,
      userTrackingId: 'user-1',
      collectorTrackingId: 'collector-1',
    });
    prismaMock.collectorApplication.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.collector.findFirst.mockResolvedValue(null);

    const result = await service.updateEmail(
      'application-1',
      'correct@example.com',
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { trackingId: 'user-1' },
      data: { email: 'correct@example.com', emailVerified: false },
    });
    expect(prismaMock.collector.update).toHaveBeenCalledWith({
      where: { trackingId: 'collector-1' },
      data: { contactEmail: 'correct@example.com' },
    });
    expect(prismaMock.collectorApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactEmail: 'correct@example.com',
          invitedAt: null,
          inviteTokenHash: expect.any(String),
          inviteExpiresAt: expect.any(Date),
        }),
      }),
    );
    expect(result.invitationSent).toBe(false);
  });

  it('refuses email correction after account activation', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      activatedAt: new Date(),
    });

    await expect(
      service.updateEmail('application-1', 'correct@example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.collectorApplication.update).not.toHaveBeenCalled();
  });

  it('deletes a pending application', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      activatedAt: null,
      userTrackingId: null,
      collectorTrackingId: null,
    });
    prismaMock.collectorApplication.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove('application-1')).resolves.toEqual({
      trackingId: 'application-1',
      deleted: true,
    });
    expect(prismaMock.collectorApplication.deleteMany).toHaveBeenCalledWith({
      where: { trackingId: 'application-1', activatedAt: null },
    });
  });

  it('deletes the provisional account with an approved application', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      activatedAt: null,
      userTrackingId: 'user-1',
      collectorTrackingId: 'collector-1',
    });
    prismaMock.collectorApplication.deleteMany.mockResolvedValue({ count: 1 });

    await service.remove('application-1');

    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { trackingId: 'user-1', isActive: false },
    });
    expect(prismaMock.collector.deleteMany).toHaveBeenCalledWith({
      where: { trackingId: 'collector-1', users: { none: {} } },
    });
  });

  it('refuses deletion after account activation', async () => {
    prismaMock.collectorApplication.findUnique.mockResolvedValue({
      trackingId: 'application-1',
      activatedAt: new Date(),
      userTrackingId: 'user-1',
      collectorTrackingId: 'collector-1',
    });

    await expect(service.remove('application-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.collectorApplication.deleteMany).not.toHaveBeenCalled();
  });
});
