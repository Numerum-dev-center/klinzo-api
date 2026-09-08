import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { Role } from '@prisma/client';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  const now = new Date('2026-01-01T00:00:00.000Z');

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects update when the target email already belongs to another user', async () => {
    prismaServiceMock.user.findUnique
      .mockResolvedValueOnce({
        trackingId: 'user-1',
        firstName: 'User',
        lastName: 'One',
        email: 'one@example.com',
        emailVerified: true,
        phone: '0000000000',
        role: Role.USAGER,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        collector: null,
      })
      .mockResolvedValueOnce({
        trackingId: 'user-2',
        email: 'taken@example.com',
      });

    await expect(
      service.update('user-1', { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
  });

  it('does not copy password, refresh hash or internal IDs into public user entities', () => {
    const entity = new UserEntity({
      id: BigInt(1),
      trackingId: 'user-1',
      firstName: 'User',
      lastName: 'One',
      email: 'one@example.com',
      emailVerified: true,
      phone: '0000000000',
      password: 'hashed-password',
      hashedRefreshToken: 'hashed-refresh-token',
      role: Role.USAGER,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      collectorId: BigInt(2),
      collectorTrackingId: 'collector-1',
    });

    const serialized = instanceToPlain(entity);

    expect(serialized).not.toHaveProperty('id');
    expect(serialized).not.toHaveProperty('password');
    expect(serialized).not.toHaveProperty('hashedRefreshToken');
    expect(serialized).not.toHaveProperty('collectorId');
    expect(entity.collectorTrackingId).toBe('collector-1');
  });
});
