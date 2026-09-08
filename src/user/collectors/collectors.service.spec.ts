import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectorType } from './entities/enums/collector-type.enum';
import { KycStatus } from './entities/enums/kyc-status.enum';
import { CollectorsService } from './collectors.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('CollectorsService', () => {
  let service: CollectorsService;
  const now = new Date('2026-01-01T00:00:00.000Z');

  const collector = {
    id: BigInt(1),
    trackingId: 'collector-1',
    companyName: 'Klinzo Partner',
    registrationNumber: 'RC-001',
    contactEmail: 'partner@example.com',
    contactPhone: '+22890000000',
    type: CollectorType.COMPANY,
    adresse: 'Lome',
    kycStatus: KycStatus.APPROVED,
    ratingAverage: 0,
    payoutAccount: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const prismaServiceMock = {
    collector: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectorsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<CollectorsService>(CollectorsService);
  });

  it('suspends a collector by deactivating it and marking KYC as suspended', async () => {
    prismaServiceMock.collector.findUnique.mockResolvedValue(collector);
    prismaServiceMock.collector.update.mockResolvedValue({
      ...collector,
      isActive: false,
      kycStatus: KycStatus.SUSPENDED,
    });

    const result = await service.suspend('collector-1');

    expect(prismaServiceMock.collector.update).toHaveBeenCalledWith({
      where: { trackingId: 'collector-1' },
      data: { isActive: false, kycStatus: KycStatus.SUSPENDED },
    });
    expect(result.isActive).toBe(false);
    expect(result.kycStatus).toBe(KycStatus.SUSPENDED);
  });

  it('rejects suspension when the collector is already inactive', async () => {
    prismaServiceMock.collector.findUnique.mockResolvedValue({
      ...collector,
      isActive: false,
    });

    await expect(service.suspend('collector-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.collector.update).not.toHaveBeenCalled();
  });

  it('lists only active collectors with approved KYC status', async () => {
    prismaServiceMock.collector.count.mockResolvedValue(1);
    prismaServiceMock.collector.findMany.mockResolvedValue([collector]);

    const result = await service.getActiveCollectors({
      page: 1,
      size: 10,
      skip: 0,
      take: 10,
    } as any);

    expect(prismaServiceMock.collector.count).toHaveBeenCalledWith({
      where: { isActive: true, kycStatus: KycStatus.APPROVED },
    });
    expect(prismaServiceMock.collector.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, kycStatus: KycStatus.APPROVED },
      }),
    );
    expect(result.data).toHaveLength(1);
  });
});
