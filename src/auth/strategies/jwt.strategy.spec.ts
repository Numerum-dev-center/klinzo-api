import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { UserService } from '../../user/users/user.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configServiceMock = {
    get: jest.fn().mockReturnValue('test_access_secret_with_32_chars_minimum'),
  } as unknown as ConfigService;

  const userServiceMock = {
    findByTrackingIdForAuth: jest.fn(),
  } as unknown as UserService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates the request user from the active database user', async () => {
    (userServiceMock.findByTrackingIdForAuth as jest.Mock).mockResolvedValue({
      trackingId: 'user-1',
      email: 'updated@example.com',
      role: Role.GESTIONNAIRE_SAAS,
      isActive: true,
    });

    const strategy = new JwtStrategy(configServiceMock, userServiceMock);
    const result = await strategy.validate({
      sub: 'user-1',
      email: 'stale@example.com',
      role: Role.USAGER,
    });

    expect(result).toEqual({
      trackingId: 'user-1',
      email: 'updated@example.com',
      role: Role.GESTIONNAIRE_SAAS,
    });
  });

  it('rejects tokens for inactive users', async () => {
    (userServiceMock.findByTrackingIdForAuth as jest.Mock).mockResolvedValue({
      trackingId: 'user-1',
      email: 'inactive@example.com',
      role: Role.USAGER,
      isActive: false,
    });

    const strategy = new JwtStrategy(configServiceMock, userServiceMock);

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'inactive@example.com',
        role: Role.USAGER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens for missing users', async () => {
    (userServiceMock.findByTrackingIdForAuth as jest.Mock).mockResolvedValue(
      null,
    );

    const strategy = new JwtStrategy(configServiceMock, userServiceMock);

    await expect(
      strategy.validate({
        sub: 'missing-user',
        email: 'missing@example.com',
        role: Role.USAGER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
