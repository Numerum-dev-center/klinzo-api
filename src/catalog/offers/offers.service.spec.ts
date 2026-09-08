import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { KycStatus, Role } from '@prisma/client';
import { OffersService } from './offers.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('OffersService', () => {
  let service: OffersService;

  const prismaServiceMock = {
    collector: {
      findUnique: jest.fn(),
    },
    zone: {
      findUnique: jest.fn(),
    },
    offer: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const requester = {
    trackingId: 'admin-1',
    role: Role.GESTIONNAIRE_SAAS,
  };

  const createDto = {
    name: 'Collecte mensuelle',
    price: 5000,
    frequency: 'MENSUEL',
    wasteType: 'MENAGER',
    collectorTrackingId: 'collector-1',
    zoneTrackingId: 'zone-1',
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('rejects offer creation for collectors without approved KYC', async () => {
    prismaServiceMock.collector.findUnique.mockResolvedValue({
      id: BigInt(1),
      isActive: true,
      kycStatus: KycStatus.PENDING_REVIEW,
    });

    await expect(service.create(createDto, requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.offer.create).not.toHaveBeenCalled();
  });

  it('rejects offer creation on an inactive zone', async () => {
    prismaServiceMock.collector.findUnique.mockResolvedValue({
      id: BigInt(1),
      isActive: true,
      kycStatus: KycStatus.APPROVED,
    });
    prismaServiceMock.zone.findUnique.mockResolvedValue({
      id: BigInt(1),
      isActive: false,
    });

    await expect(service.create(createDto, requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.offer.create).not.toHaveBeenCalled();
  });

  it('rejects offer activation when the collector is suspended', async () => {
    prismaServiceMock.offer.findUnique.mockResolvedValue({
      id: BigInt(1),
      trackingId: 'offer-1',
      collectorId: BigInt(1),
      isActive: false,
      collector: {
        isActive: false,
        kycStatus: KycStatus.APPROVED,
      },
      zone: {
        isActive: true,
      },
    });

    await expect(service.activate('offer-1', requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.offer.update).not.toHaveBeenCalled();
  });
});
